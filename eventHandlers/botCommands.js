/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { appendMemory } = require("../functions/memories");
const path = require("path");
const fs = require("fs");
const { unlink } = require("fs/promises");

const { reputation } = require("../db/reputation");
const searchHandler = require("./searchHandler");
const { svgToPng } = require("../utils/svg2png");
const { fuzzySearch } = require("../utils/fuzzySearch");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const tmpDir = path.join(global.dirname, "data", "running", "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  log(`Created temporary directory: ${tmpDir}`, "info", "botCommands.js");
}

async function parseBotCommands(toolCalls, message) {
  const reactionsToAdd = new Set();
  const generatedSvgFiles = [];
  const toolResponses = [];

  for (const toolCall of toolCalls) {
    log(`Processing tool call: ${toolCall.name}`, "info", "botCommands.js");
    const args = toolCall.args || {};
    let response = {};

    switch (toolCall.name) {
      case "reputation": {
        const { type } = args;
        const userId = message.author.id;
        try {
          if (type === "increase") {
            await reputation(userId, "increase");
            reactionsToAdd.add(state.emojis["upvote"]);
            response.content = "Reputation increased.";
          } else if (type === "decrease") {
            await reputation(userId, "decrease");
            reactionsToAdd.add(state.emojis["downvote"]);
            response.content = "Reputation decreased.";
          } else {
            response.content = "Invalid reputation type specified.";
            log(`Invalid reputation type: ${type}`, "warn", "botCommands.js");
          }
        } catch (e) {
          console.error(
            `Reputation command failed (type: ${type}, userId: ${userId}): ${e}`,
          );
          response.content = `Failed to update reputation: ${e.message || "Unknown error"}`;
        }
        break;
      }
      case "memory": {
        const { string: memStr } = args;
        if (memStr) {
          try {
            await appendMemory(memStr, message.channel.id);
            response.content = "Memory saved.";
          } catch (e) {
            console.error(`Failed to save memory: "${memStr}" - ${e}`);
            response.content = `Failed to save memory: ${e.message || "Unknown error"}`;
          }
        } else {
          log(`Skipped empty memory command.`, "warn", "botCommands.js");
          response.content = "Empty memory not saved.";
        }
        break;
      }
      case "mute": {
        const {
          userID: userIdToMute,
          seconds,
          reason: muteReason,
          muteFor,
        } = args;
        const messageUID = message.author.id;
        const userIdToMuteStr = userIdToMute.toString();
        let muteID = userIdToMuteStr;
        // this was put here, to prevent accidental typos made by the bot
        if (fuzzySearch(userIdToMuteStr, [messageUID], 0.3)) {
          muteID = messageUID;
        }
        // Predefined mute durations, so a schizophrenic/hallucinating bot won't mute for 1000 years
        const predefinedDurations = {
          Spam: 60, // 1m
          Inappropriate_Language: 120, // 2m
          Harassment: 600, // 10min
          Advertising: 1800, // 30min
          Trolling: 120, // 2min, yeah thats enough
          Mass_Mentions: 600, // 10min
          Evading_Punishment: 7200, // 2h, fair enough
          Sharing_Personal_Information: 43200, // 12h
          Raiding_and_Coordinated_Spam: 3600, // 1h, prob the mods hop on dc if a raid happens
        };

        let muteDurationSeconds;
        if (muteFor && muteFor !== "Other") {
          muteDurationSeconds = predefinedDurations[muteFor];
        } else {
          // check if seconds is valid
          if (typeof seconds !== "number" || seconds <= 0) {
            // fall back to 30 sec
            muteDurationSeconds = 30;
          } else {
            muteDurationSeconds = seconds;
          }
        }

        const time = muteDurationSeconds ? muteDurationSeconds * 1000 : 0;
        const reason =
          muteReason ||
          (muteFor && muteFor !== "Other"
            ? muteFor.replace(/_/g, " ")
            : "No reason provided.");

        if (!muteID || !time || time <= 0) {
          log(
            `Invalid mute parameters: ${JSON.stringify(args)}`,
            "warn",
            "botCommands.js",
          );
          response.content = "Wrong mute format, invalid parameters.";
          break;
        }

        const guild = message.guild;
        if (!guild) {
          response.content = state.strings.muting.onlyServers;
          break;
        }
        if (
          muteID !== message.author.id &&
          !config.OWNERS.includes(message.author.id)
        ) {
          response.content = state.strings.muting.cantMuteOthers;
          break;
        }

        try {
          const member = await guild.members.fetch(muteID);
          if (!member) {
            log(
              `Mute failed: Member ${muteID} not found after fetch.`,
              "warn",
              "botCommands.js",
            );
            response.content = state.strings.cantFindUser;
            break;
          }

          await member.timeout(time, reason);
          log(
            `User ${muteID} muted for ${time / 1000}s. Reason: ${reason}`,
            "info",
            "botCommands.js",
          );
          reactionsToAdd.add(state.emojis["mute"]);
          const user = await message.client.users.fetch(muteID);
          response.content = `User ${user.username} muted successfully.`; // Default success

          try {
            state.muteCount += 1;
            await reputation(muteID, "decrease");

            const updatedUser = await prisma.user.update({
              where: { id: muteID },
              data: { muteCount: { increment: 1 } },
            });

            if (updatedUser.muteCount > config.BAN_AFTER) {
              await prisma.user.update({
                where: { id: muteID },
                data: {
                  banned: true,
                  banMessage: `Automated action after ${config.BAN_AFTER.toString()} mutes`,
                },
              });
              await user.send({
                content: state.strings.muting.autoBan.replace(
                  "{COUNT}",
                  config.BAN_AFTER.toString(),
                ),
              });
            }

            await user.send({
              content: `${state.strings.muteMessage.replace("[REASON]", reason).replace("[TIME]", time / 1000)}\n${state.strings.automatedMessage}`,
            });
          } catch (postMuteError) {
            console.error(
              `Mute for ${muteID} succeeded, but post-mute actions (DB/DM) failed: ${postMuteError}`,
            );
          }
        } catch (e) {
          if (e.code === 10007 || e.code === 10013) {
            log(
              `Mute failed: Member ${muteID} not found in guild. Error: ${e.message}`,
              "warn",
              "botCommands.js",
            );
            response.content = state.strings.cantFindUser;
          } else if (e.code === 50013) {
            console.error(
              `Mute failed for ${muteID}: Missing permissions. Error: ${e.message}`,
            );
            response.content = state.strings.muting.notEnoughPerms;
          } else {
            console.error(`Failed to mute user ${muteID}: ${e.stack}`);
            response.content = state.strings.muting.genericFail;
          }
        }
        break;
      }
      case "svg": {
        const { code: svgCode } = args;
        if (!svgCode) {
          log(`Empty SVG code found.`, "warn", "botCommands.js");
          response.content = "Empty SVG code";
          break;
        }

        try {
          const pngBuffer = await svgToPng(svgCode);
          const artifactPath = path.join(
            tmpDir,
            `artifact_svg_${message.id}_${Date.now()}.png`,
          );
          fs.writeFileSync(artifactPath, pngBuffer);
          generatedSvgFiles.push(artifactPath);
          response.content = "SVG generated and will be sent";
        } catch (e) {
          console.error(`Failed to convert SVG to PNG: ${e}`);
          response.content = state.strings.svgConverionError;
        }
        break;
      }
      case "search": {
        const { query: searchQuery } = args;
        if (searchQuery) {
          try {
            response.content = await searchHandler(searchQuery);
            reactionsToAdd.add(state.emojis["search"]);
          } catch (searchError) {
            console.error(
              `Search handler failed for query "${searchQuery}": ${searchError}`,
            );
            response.content = state.strings.searchFailed;
          }
        } else {
          response.content = state.strings.searchFailed;
        }
        break;
      }

      default:
        log(`Unknown tool call: ${toolCall.name}`, "warn", "botCommands.js");
        response.content = `[Unknown tool: ${toolCall.name}]`;
    }

    toolResponses.push({
      name: toolCall.name,
      response,
    });
  }

  if (generatedSvgFiles.length > 0) {
    try {
      await message.channel.send({ files: generatedSvgFiles });
    } catch (sendError) {
      console.error(`Failed to send SVG artifact(s): ${sendError}`);
    } finally {
      for (const filePath of generatedSvgFiles) {
        try {
          await unlink(filePath);
        } catch (unlinkError) {
          log(
            `Failed to delete temp SVG artifact ${filePath}: ${unlinkError}`,
            "warn",
            "botCommands.js",
          );
        }
      }
    }
  }

  if (reactionsToAdd.size > 0) {
    try {
      for (const emoji of reactionsToAdd) {
        await message
          .react(emoji)
          .catch((e) =>
            log(
              `Failed to react with ${emoji}: ${e}`,
              "warn",
              "botCommands.js",
            ),
          );
      }
    } catch (e) {
      console.error(`Failed to apply reactions: ${e}`);
    }
  }

  return toolResponses;
}

module.exports = parseBotCommands;

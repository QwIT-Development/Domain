/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/



const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const config = require("../config.json");
const { appendMemory } = require("../functions/memories");
const path = require("path");
const fs = require("fs");
const { unlink } = require("fs/promises");

const { reputation } = require("../utils/reputation");
const searchHandler = require("./searchHandler");
const { svgToPng } = require("../utils/svg2png");
const strings = require("../data/strings.json");

const tmpDir = path.join(global.dirname, 'data', 'running', 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    log(`Created temporary directory: ${tmpDir}`, 'info', 'botCommands.js');
}

async function parseBotCommands(toolCalls, message, gemini) {
    const reactionsToAdd = new Set();
    const generatedSvgFiles = [];
    const toolResponses = [];

    for (const toolCall of toolCalls) {
        log(`Processing tool call: ${toolCall.name}`, 'info', 'botCommands.js');
        const args = toolCall.args || {};
        let response = {};

        switch (toolCall.name) {
            case 'reputation': {
                const { type } = args;
                const userId = message.author.id;
                if (type === 'increase') {
                    reputation(userId, "increase").catch(e => console.error(`Reputation increase failed: ${e}`));
                    reactionsToAdd.add(state.emojis["upvote"]);
                    response.content = "Reputation increased.";
                } else if (type === 'decrease') {
                    reputation(userId, "decrease").catch(e => console.error(`Reputation decrease failed: ${e}`));
                    reactionsToAdd.add(state.emojis["downvote"]);
                    response.content = "Reputation decreased.";
                }
                break;
            }
            case 'memory': {
                const { string: memStr } = args;
                if (memStr) {
                    appendMemory(memStr, message.channel.id).catch(e => console.error(`Failed to save memory: "${memStr}" - ${e}`));
                    response.content = "Memory saved.";
                } else {
                    log(`Skipped empty memory command.`, 'warn', 'botCommands.js');
                    response.content = "Empty memory not saved.";
                }
                break;
            }
            case 'mute': {
                const { userID: userIdToMute, seconds, reason: muteReason } = args;
                const time = seconds ? seconds * 1000 : 0;
                const reason = muteReason || 'No reason provided.';

                if (!userIdToMute || !time || time <= 0) {
                    log(`Invalid mute parameters: ${JSON.stringify(args)}`, 'warn', 'botCommands.js');
                    response.content = '[Rossz mute format]';
                    break;
                }

                const guild = message.guild;
                if (!guild) {
                    response.content = '[A némítás csak szervereken működik]';
                    break;
                }

                if (userIdToMute.toString() !== message.author.id && !config.OWNERS.includes(message.author.id)) {
                    response.content = '[Nem némíthatsz el mást]';
                } else {
                    try {
                        const member = await guild.members.fetch(userIdToMute.toString());
                        if (member) {
                            await member.timeout(time, reason);
                            reactionsToAdd.add(state.emojis["mute"]);
                            log(`User ${userIdToMute} muted for ${time / 1000}s. Reason: ${reason}`, 'info', 'botCommands.js');
                            state.muteCount += 1;
                            reputation(userIdToMute.toString(), "decrease").catch(e => console.error(`Reputation decrease failed: ${e}`));

                            const user = await message.client.users.fetch(userIdToMute.toString());
                            await user.send({
                                content: `${strings.muteMessage.replace("[REASON]", `"${reason}"`).replace("[TIME]", time / 1000)}\n${strings.automatedMessage}`
                            });
                            response.content = `User ${userIdToMute} muted successfully.`;
                        } else {
                            log(`Mute failed: Member ${userIdToMute} not found after fetch.`, 'warn', 'botCommands.js');
                            response.content = `[Felhasználó nem található]`;
                        }
                    } catch (e) {
                        if (e.code === 10007 || e.code === 10013) {
                            log(`Mute failed: Member ${userIdToMute} not found in guild.`, 'warn', 'botCommands.js');
                            response.content = `[Felhasználó nem található]`;
                        } else if (e.code === 50013) {
                            console.error(`Mute failed: Missing permissions to mute ${userIdToMute}. ${e}`);
                            response.content = `[Nincs elég jog a némításhoz (contact admin on server)]`;
                        } else {
                            console.error(`Failed to mute user ${userIdToMute}: ${e}`);
                            response.content = `[Némítás besült]`;
                        }
                    }
                }
                break;
            }
            case 'svg': {
                const { code: svgCode } = args;
                if (!svgCode) {
                    log(`Empty SVG code found.`, 'warn', 'botCommands.js');
                    response.content = "[Empty SVG code]";
                    break;
                }

                try {
                    const pngBuffer = await svgToPng(svgCode);
                    const artifactPath = path.join(tmpDir, `artifact_svg_${message.id}_${Date.now()}.png`);
                    fs.writeFileSync(artifactPath, pngBuffer);
                    generatedSvgFiles.push(artifactPath);
                    response.content = "[SVG generated and will be sent]";
                } catch (e) {
                    console.error(`Failed to convert SVG to PNG: ${e}`);
                    response.content = `[SVG konvertálási hiba]`;
                }
                break;
            }
            case 'search': {
                const { query: searchQuery } = args;
                if (searchQuery) {
                    try {
                        const searchResult = await searchHandler(searchQuery);
                        response.content = searchResult;
                        reactionsToAdd.add(state.emojis["search"]);
                    } catch (searchError) {
                        console.error(`Search handler failed for query "${searchQuery}": ${searchError}`);
                        response.content = `[Keresés besült]`;
                    }
                } else {
                    response.content = "[Rossz keresés]";
                }
                break;
            }
            default:
                log(`Unknown tool call: ${toolCall.name}`, 'warn', 'botCommands.js');
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
                    log(`Failed to delete temp SVG artifact ${filePath}: ${unlinkError}`, 'warn', 'botCommands.js');
                }
            }
        }
    }

    if (reactionsToAdd.size > 0) {
        try {
            for (const emoji of reactionsToAdd) {
                await message.react(emoji).catch(e => log(`Failed to react with ${emoji}: ${e}`, 'warn', 'botCommands.js'));
            }
        } catch (e) {
            console.error(`Failed to apply reactions: ${e}`);
        }
    }

    return toolResponses;
}

module.exports = parseBotCommands;
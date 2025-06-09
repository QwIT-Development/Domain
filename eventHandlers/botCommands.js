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

function getUserIdFromMuteMatch(match) {
    return match[1] || match[2];
}

const tmpDir = path.join(global.dirname, 'data', 'running', 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    log(`Created temporary directory: ${tmpDir}`, 'info', 'botCommands.js');
}


async function parseBotCommands(string, message, gemini) {
    let out = string.trim();
    const reactionsToAdd = new Set();

    try {
        const repRegex = /\[?([+-])?rep]?/gi;
        out = out.replaceAll(repRegex, (match, sign) => {
            const userId = message.author.id;
            if (sign === '+') {
                reputation(userId, "increase").catch(e => log(`Reputation increase failed: ${e}`, 'error', 'botCommands.js'));
                reactionsToAdd.add(state.emojis["upvote"]);
            } else if (sign === '-') {
                reputation(userId, "decrease").catch(e => log(`Reputation decrease failed: ${e}`, 'error', 'botCommands.js'));
                reactionsToAdd.add(state.emojis["downvote"]);
            }
            return "";
        });
        out = out.trim();
    } catch (e) {
        log(`Failed during reputation processing: ${e}`, 'error', 'botCommands.js');
    }

    try {
        const memRegex = /memory\["?(.*?)"?]/gmi;
        const memMatches = Array.from(out.matchAll(memRegex));
        if (memMatches.length > 0) {
            for (const match of memMatches) {
                const memStr = match[1]?.trim();
                out = out.replace(match[0], "");
                if (memStr) {
                    appendMemory(memStr, message.channel.id).catch(e => log(`Failed to save memory: "${memStr}" - ${e}`, 'error', 'botCommands.js'));
                } else {
                    log(`Skipped empty memory command.`, 'warn', 'botCommands.js');
                }
            }
            out = out.trim();
        }
    } catch (e) {
        log(`Failed during memory processing: ${e}`, 'error', 'botCommands.js');
    }


    try {
        const muteRegex = /mute\[\s*(?:<@!?)?(\d+)>?\s*,\s*(\d+)\s*(?:,\s*([^\]]*))?\s*]/gmi;
        const muteMatches = Array.from(out.matchAll(muteRegex));
        if (muteMatches.length > 0) {
            const guild = message.guild;
            if (guild) {
                for (const match of muteMatches) {
                    const commandText = match[0];
                    const userIdToMute = getUserIdFromMuteMatch(match);
                    const time = parseInt(match[3], 10) * 1000;
                    const reason = match[4]?.trim() || 'No reason provided.';

                    if (!userIdToMute || isNaN(time) || time <= 0) {
                        log(`Invalid mute parameters: ${commandText}`, 'warn', 'botCommands.js');
                        out = out.replace(commandText, '[Rossz mute format]');
                        continue;
                    }

                    if (userIdToMute !== message.author.id && !config.OWNERS.includes(message.author.id)) {
                        out = out.replace(commandText, '[Nem némíthatsz el mást]');
                    } else {
                        try {
                            const member = await guild.members.fetch(userIdToMute);
                            if (member) {
                                await member.timeout(time, reason);
                                reactionsToAdd.add(state.emojis["mute"]);
                                out = out.replace(commandText, "");
                                log(`User ${userIdToMute} muted for ${time/1000}s. Reason: ${reason}`, 'info', 'botCommands.js');
                                state.muteCount += 1;
                                // mute penalty
                                reputation(userIdToMute, "decrease").catch(e => log(`Reputation decrease failed: ${e}`, 'error', 'botCommands.js'));

                                // dm user
                                const user = await message.client.users.fetch(userIdToMute);
                                await user.send({
                                    content: `${strings.muteMessage.replace("[REASON]", '"'+reason+'"').replace("[TIME]", time / 1000)}
${strings.automatedMessage}`
                                });

                            } else {
                                log(`Mute failed: Member ${userIdToMute} not found after fetch.`, 'warn', 'botCommands.js');
                                out = out.replace(commandText, `[Felhasználó nem található]`);
                            }
                        } catch (e) {
                            if (e.code === 10007 || e.code === 10013) {
                                log(`Mute failed: Member ${userIdToMute} not found in guild.`, 'warn', 'botCommands.js');
                                out = out.replace(commandText, `[Felhasználó nem található]`);
                            } else if (e.code === 50013) {
                                log(`Mute failed: Missing permissions to mute ${userIdToMute}. ${e}`, 'error', 'botCommands.js');
                                out = out.replace(commandText, `[Nincs elég jog a némításhoz (contact admin on server)]`);
                            } else {
                                log(`Failed to mute user ${userIdToMute}: ${e}`, 'error', 'botCommands.js');
                                out = out.replace(commandText, `[Némítás besült]`);
                            }
                        }
                    }
                }
                out = out.trim();
            } else {
                out = out.replaceAll(muteRegex, '[A némítás csak szervereken működik]');
                out = out.trim();
            }
        }
    } catch (e) {
        log(`Failed during mute processing: ${e}`, 'error', 'botCommands.js');
    }


    const generatedSvgFiles = [];
    try {
        const svgRegex = /svg\[([\s\S]*?)]/gmi;
        const svgMatches = Array.from(out.matchAll(svgRegex));
        if (svgMatches.length > 0) {
            let svgProcessingError = false;

            for (const match of svgMatches) {
                const commandText = match[0];
                const svgCode = match[1]?.trim();
                out = out.replace(commandText, "");

                if (!svgCode) {
                    log(`Empty SVG code found.`, 'warn', 'botCommands.js');
                    continue;
                }

                try {
                    const pngBuffer = await svgToPng(svgCode);
                    const artifactPath = path.join(tmpDir, `artifact_svg_${message.id}_${Date.now()}.png`);
                    fs.writeFileSync(artifactPath, pngBuffer);
                    generatedSvgFiles.push(artifactPath);
                } catch (e) {
                    log(`Failed to convert SVG to PNG: ${e}`, 'error', 'botCommands.js');
                    svgProcessingError = true;
                    out += ` [SVG konvertálási hiba]`;
                }
            }
            out = out.trim();

            if (generatedSvgFiles.length > 0) {
                try {
                    await message.channel.send({ files: generatedSvgFiles });
                } catch (sendError) {
                    log(`Failed to send SVG artifact(s): ${sendError}`, 'error', 'botCommands.js');
                    out += ` [Nem sikerült elküldeni a képeket]`;
                    svgProcessingError = true;
                }
            }
        }
    } catch (e) {
        log(`Failed during SVG processing block: ${e}`, 'error', 'botCommands.js');
    } finally {
        for (const filePath of generatedSvgFiles) {
            try {
                await unlink(filePath);
            } catch (unlinkError) {
                log(`Failed to delete temp SVG artifact ${filePath}: ${unlinkError}`, 'warn', 'botCommands.js');
            }
        }
    }


    try {
        const searchRegex = /search\[(.*?)]/mi;
        const searchMatch = out.match(searchRegex);
        if (searchMatch) {
            const commandText = searchMatch[0];
            const searchQuery = searchMatch[1]?.trim();

            if (searchQuery) {
                out = out.replace(commandText, "").trim();
                try {
                    const searchResult = await searchHandler(searchQuery, message.channel.id, gemini);
                    out = `${searchResult}\n${out}`.trim();
                    reactionsToAdd.add(state.emojis["search"]);
                } catch(searchError) {
                    log(`Search handler failed for query "${searchQuery}": ${searchError}`, 'error', 'botCommands.js');
                    out += ` [Keresés besült]`;
                }
            } else {
                out = out.replace(commandText, "[Rossz keresés]").trim();
            }
        }
    } catch (e) {
        log(`Failed during search processing: ${e}`, 'error', 'botCommands.js');
    }


    if (reactionsToAdd.size > 0) {
        try {
            for (const emoji of reactionsToAdd) {
                await message.react(emoji).catch(e => log(`Failed to react with ${emoji}: ${e}`, 'warn', 'botCommands.js'));
            }
        } catch (e) {
            log(`Failed to apply reactions: ${e}`, 'error', 'botCommands.js');
        }
    }

    return out.trim();
}

module.exports = parseBotCommands;
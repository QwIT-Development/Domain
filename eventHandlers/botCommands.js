/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


// TODO: finish ts
const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const config = require("../config.json");
const {appendMemory} = require("../functions/memories");

async function parseBotCommands(string, message, gemini) {
    let out = string.trim();

    // rep handling
    const {reputation} = require("../utils/reputation");
    if (out.includes("+rep") || out.includes("-rep")) {
        try {
            const user = message.author.id
            if (out.includes("+rep")) {
                await reputation(user, "increase");
                out = out.replaceAll(/\[?\+rep]?/gmi, "");
                await message.react(state.emojis["upvote"]);
            } else if (out.includes("-rep")) {
                await reputation(user, "decrease");
                out = out.replaceAll(/\[?-rep]?/gmi, "");
                await message.react(state.emojis["downvote"]);
            }
        } catch (e) {
            log(`Failed to execute reputation command: ${e}`, 'error', 'botCommands.js');
        }
    }
    out = out.trim();

    // handle mem saving memory[message]
    if (out.includes("memory[")) {
        try {
            const regex = /memory\["?(.*?)"?]/gmi;
            const matches = out.matchAll(regex);

            if (matches.length >= 1) {
                for (const match of matches) {
                    const memStr = match[1];
                    out = out.replaceAll(match[0], "").trim();
                    await appendMemory(memStr);
                }
            }
        } catch (e) {
            log(`Failed to execute memory command: ${e}`, 'error', 'botCommands.js');
        }
    }
    out = out.trim();

    // handle search
    const searchHandler = require("./searchHandler");
    if (out.includes("search[")) {
        try {
            // example: search[minceraft r34]
            // ^ ez a komment a regi kodbol jon, lehet zypherift irta de nem biztos
            const regex = /search\[(.*?)]/gmi;
            const match = regex.exec(out);
            // remove search command in case it doesn't get executed or it errors out
            out = out.replaceAll(match[0], "").trim();
            if (match) {
                out = await searchHandler(match[1], message.channel.id, gemini);
                // rerun regex filter, idk
                out = out.replaceAll(regex.exec(out)[0], "").trim();
                await message.react(state.emojis["search"]);
            }
        } catch (e) {
            log(`Failed to execute search command: ${e}`, 'error', 'botCommands.js');
        }
    }
    out = out.trim();

    if (out.includes("mute[")) {
        try {
            const regex = /mute\[(.*?), ?(.*?), ?"?(.*?)"?]/gmi;
            const matches = out.matchAll(regex);

            if (matches.length >= 1) {
                for (const match of matches) {
                    const userId = match[1].trim();
                    if (userId !== message.author.id && !config.OWNERS.includes(message.author.id)) {
                        out = out.replace(match[0], '[Nem némíthatsz el mást]').trim();
                    } else {
                        const time = parseInt(match[2], 10) * 1000;
                        const reason = match[3].trim();
                        const guild = message.guild;
                        out = out.replace(match[0], "").trim();
                        if (guild) {
                            try {
                                const member = await guild.members.fetch(userId);
                                await member.timeout(time, reason);
                                await message.react(state.emojis["mute"]);
                            } catch (e) {
                                log(`Failed to mute user: ${e}`, 'error', 'botCommands.js');
                            }
                        }
                    }
                }
            }
        } catch (e) {
            log(`Failed to execute mute command: ${e}`, 'error', 'botCommands.js');
        }
    }

    return out.trim();
}

module.exports = parseBotCommands;
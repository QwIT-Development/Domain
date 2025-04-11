/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


// TODO: finish ts
const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const config = require("../config.json");
const searchHandler = require("./searchHandler");
const {reputation} = require("../utils/reputation");

async function parseBotCommands(string, message, gemini) {
    let out = string;

    // rep handling
    const {reputation} = require("../utils/reputation");
    if (out.includes("[+rep]" || out.includes("[-rep]"))) {
        try {
            const user = message.author.id
            if (out.includes("[+rep]")) {
                await reputation(user, "increase");
                out = out.replaceAll("[+rep]", "");
                await message.react(state.emojis["upvote"]);
            } else if (out.includes("[-rep]")) {
                await reputation(user, "decrease");
                out = out.replaceAll("[-rep]", "");
                await message.react(state.emojis["downvote"]);
            }
        } catch (e) {
            log(`Failed to execute reputation command: ${e}`, 'error', 'botCommands.js');
        }
    }

    // handle mem saving memory[message]
    if (out.includes("memory[")) {

    }

    // handle search
    const searchHandler = require("./searchHandler");
    if (out.includes("search[")) {
        try {
            // example: search[minceraft r34]
            // ^ ez a komment a regi kodbol jon, lehet zypherift irta de nem biztos
            const regex = /search\[(.+?)]/gmi;
            const match = regex.exec(out);
            if (match) {
                out = await searchHandler(match[1], message.channel.id, gemini);
                await message.react(state.emojis["search"]);
            }
        } catch (e) {
            log(`Failed to execute search command: ${e}`, 'error', 'botCommands.js');
        }
    }

    if (out.includes("mute[")) {
        try {
            // example: mute[user_id,time,reason]
            const regex = /mute\[(\S+), ?(\S+), ?(\S+)]/gmi;
            const match = regex.exec(out);
            if (match) {
                const userId = match[1];
                if (userId !== message.author.id && !config.OWNERS.includes(message.author.id)) {
                    out = out.replaceAll(match[0], '[Nem némíthatsz el mást]').trim();
                }
                const time = parseInt(match[2]) * 1000;
                const reason = match[3];
                const guild = message.guild;
                out = out.replaceAll(match[0], "").trim();
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
        } catch (e) {
            log(`Failed to execute mute command: ${e}`, 'error', 'botCommands.js');
        }
    }

    return out;
}

module.exports = parseBotCommands;
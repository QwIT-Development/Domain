/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


// TODO: finish ts
const {reputation} = require("../utils/reputation");
const state = require("../initializers/state");

async function parseBotCommands(string, message) {
    let out = string;

    // rep handling
    if (out.includes("[+rep]" || out.includes("[-rep]"))) {
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
    }

    // handle mem saving mem[message]
    if (out.includes("mem[")) {

    }

    return out;
}

module.exports = parseBotCommands;
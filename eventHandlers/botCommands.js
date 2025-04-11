/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


// TODO: finish ts
const state = require("../initializers/state");

async function parseBotCommands(string, message, gemini) {
    let out = string;

    // rep handling
    const {reputation} = require("../utils/reputation");
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

    // handle search
    const searchHandler = require("./searchHandler");
    if (out.includes("s[")) {
        // example: s[minceraft r34]
        // ^ ez a komment a regi kodbol jon, lehet zypherift irta de nem biztos
        const regex = /s\[(.+?)]/gmi;
        const match = regex.exec(out);
        if (match) {
            out = await searchHandler(match[1], message.channel.id, gemini);
            await message.react(state.emojis["search"]);
        }
    }

    return out;
}

module.exports = parseBotCommands;
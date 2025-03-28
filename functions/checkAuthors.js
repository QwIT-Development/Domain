/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const config = require('../config.json');
const jailbreaks = require('../data/jailbreaks.json');
const strings = require('../data/strings.json');
const log = require('../utils/betterLogs');
const {splitFuzzySearch} = require('../utils/fuzzySearch');


/**
 * megnezi, hogy megfelel-e az üzenet par dolognak (descriptionban reszletesebben leirva)
 * @param message - üzenet
 * @param client - kliens (mutingra)
 * @returns Promise<boolean>
 * @async
 *
 * @desc
 * **en vagyok a desc**\
 * lenyeg h megnezi, hogy bottol jon-e az uzenet, ha igen akk ignoralja\
 * same if domain sends it (ez leginkabb azert h ne kapjon skizo rohamot)
 * //-t ignoralja ugyszinten\
 * ha nincs trackelt csatornaba kuldve az uzenet insta returnol\
 * jailbreakra mutel is
 */
async function checkAuthors(message, client) {
    // check if message is sent into a tracked channel
    if (!config.CHANNELS.includes(message.channel.id)) return false;

    // if bot send messsagre = bad
    if (message.author.bot) return false;

    // domain shouldn't reply to himself, bc it makes him look like a schizo
    if (message.author.id === client.user.id) return false;

    // if message start with //, it ignor
    if (message.content.startsWith('//')) return false;

    // anti-jailbreak thing
    if (jailbreaks.some(jailbreak => message.content.toLowerCase().includes(jailbreak.toLowerCase()))) {
        await message.delete();

        // mute user, bc of trying to use jailbreaks :3
        const userId = message.author.id;
        const time = 1000 * 30 * 60; // 30 minutes

        try {
            const guild = await client.guilds.fetch(config.GUILD_ID);
            const member = await guild.members.fetch(userId);
            await member.timeout(time, strings["jailbreak-attempt"]);
        } catch (e) {
            // ignoralhato hiba, anyways megy a false
            log(`Failed to mute user: ${e}`, 'ignorableErr', 'checkAuthors.js');
            return false;
        }
        return false;
    }

    // return true if checks didn't get triggered
    return true;
}

/**
 * megnezi, hogy megemlitik-e domaint
 * @param message - uzenet
 * @param client - kliens (idhez)
 * @returns Promise<boolean>
 * @async
 */
async function checkForMentions(message, client) {
    // check if bot is mentioned
    const mentioned = message.mentions.users.has(client.user.id);
    if (mentioned) return true;

    // check if user is replying to the bot
    // noinspection JSUnresolvedReference
    const replied = message.reference?.messageId &&
        (await message.channel.messages.fetch(message.reference.messageId))
            .author.id === client.user.id;
    if (replied) return true;

    if (splitFuzzySearch(message.content, config.ALIASES)) return true;

    return false;
}

module.exports = {checkAuthors, checkForMentions};
/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
const jailbreaks = require('../data/jailbreaks.json');
const strings = require('../data/strings.json');
const log = require('../utils/betterLogs');
const {splitFuzzySearch} = require('../utils/fuzzySearch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


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
    if (!Object.keys(config.CHANNELS).includes(message.channel.id)) return false;

    // if bot send messsagre = bad
    if (message.author.bot) return false;

    // domain shouldn't reply to himself, bc it makes him look like a schizo
    if (message.author.id === client.user.id) return false;

    // if message start with //, it ignor
    if (message.content.startsWith('//')) return false;

    // don't allow banned users
    try {
        const user = await prisma.user.findUnique({ where: { id: message.author.id } });
        if (user?.banned) {
            return false; // User is banned
        }
    } catch (error) {
        console.error(`Error checking ban status for user ${message.author.id}: ${error.message}`);
        return false; // fallback
    }

    // anti-jailbreak thing
    if (jailbreaks.some(jailbreak => message.content.toLowerCase().includes(jailbreak.toLowerCase()))) {
        await message.delete();

        // mute user, bc of trying to use jailbreaks :3
        const userId = message.author.id;
        const time = 1000 * 30 * 60; // 30 minutes

        try {
            const guild = message.guild;
            if (!guild) {
                log(`Message wasn't sent into a guild.`, 'warn', 'checkAuthors.js');
                return false;
            }

            const member = await guild.members.fetch(userId);
            await member.timeout(time, strings["jailbreak-attempt"]);
        } catch (e) {
            // ignoralhato hiba, anyways megy a false
            log(`Failed to mute user: ${e}`, 'warn', 'checkAuthors.js');
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

    // noinspection RedundantIfStatementJS
    return (splitFuzzySearch(message.content, config.ALIASES));
}

module.exports = {checkAuthors, checkForMentions};
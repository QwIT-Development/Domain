/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const { botReady, botSleeping } = require('./botReady');
const { changeSpinnerText } = require('../utils/processInfo');

// kibasszuk a sleeptimert ha meg nem null
if (state.sleepCycleTimer === undefined) state.sleepCycleTimer = null;
if (state.isSleeping === undefined) state.isSleeping = false;

/**
 * range alapjan elkezdi a sleep beallitasat (ajanlatos configbol szulni)
 * @param {string} range - formatum: `10:00-11:00` (ennyit alszok en is)
 * @param {*} client
 * @returns {boolean} - ha fasza minden truet ad ~~(ha nem akkor nem)~~
 */
function schedSleep(range, client) {
    changeSpinnerText("Scheduling sleep...").then();

    try {
        if (!range || typeof range !== 'string') {
            log(`Invalid range format: ${range}, expected: 10:00-11:00`, 'error', 'sleeping.js');
            return false;
        }
        const parts = range.split('-').map(t => t.trim());

        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            log(`Invalid range format: ${range}, expected: 10:00-11:00`, 'error', 'sleeping.js');
            return false;
        }
        const [startStr, endStr] = parts;

        const startTimeMs = parseTime(startStr);
        const endTimeMs = parseTime(endStr);

        if (startTimeMs === null || endTimeMs === null) {
            log(`Invalid values in range: "${range}". Are you sure you used the format?`, 'error', 'sleeping.js');
            return false;
        }

        scheduleSleepCycle(startTimeMs, endTimeMs, client, endStr);

        log(`Sleep schedule set: ${startStr} - ${endStr}`, 'info', 'sleeping.js');
        return true;

    } catch (error) {
        log(`Error scheduling sleep: ${error.message}`, 'error', 'sleeping.js');
        if (state.sleepCycleTimer) {
            clearTimeout(state.sleepCycleTimer);
            state.sleepCycleTimer = null;
        }
        return false;
    }
}

/**
 * parseli az idő stringet
 * @param {string} timeStr - format (`10:00`)
 * @returns {number|null} - millisec éfjéltől számolva
 */
function parseTime(timeStr) {
    try {
        const timeRegex = /(\d{1,2}):(\d{2})/;
        const matches = timeStr.match(timeRegex);

        if (!matches) return null;

        const hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            log(`Invalid time: ${hours}:${minutes}, are you sure this right?`, 'error', 'sleeping.js');
            return null;
        }

        return (hours * 60 + minutes) * 60 * 1000;
    } catch (error) {
        log(`Error parsing time string: ${timeStr}`, 'error', 'sleeping.js');
        return null;
    }
}

/**
 * Következő "csicsikálási" eventet beállítja
 * @param {number} sleepTime - start time ms
 * @param {number} wakeTime - end tiem ms
 * @param {*} client
 * @param {string} wakeTimeStr - ido string
 */
function scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr) {
    if (state.sleepCycleTimer) clearTimeout(state.sleepCycleTimer);
    state.sleepCycleTimer = null;

    const now = new Date();
    const midnight = new Date(now).setHours(0, 0, 0, 0);
    const currentTimeMs = now.getTime() - midnight;
    const dayInMs = 24 * 60 * 60 * 1000;

    const isOvernight = sleepTime > wakeTime;

    let shouldBeSleeping;
    if (isOvernight) {
        // ejszakai idokre (e.g., 22:00-06:00)
        shouldBeSleeping = currentTimeMs >= sleepTime || currentTimeMs < wakeTime;
    } else {
        // egynapos idore (e.g., 01:00-05:00)
        shouldBeSleeping = currentTimeMs >= sleepTime && currentTimeMs < wakeTime;
    }

    if (shouldBeSleeping && !state.isSleeping) {
        state.isSleeping = true;
        botSleeping(client, wakeTimeStr).catch(err => log(`Error setting sleeping status: ${err}`, 'error', 'sleeping.js'));
    } else if (!shouldBeSleeping && state.isSleeping) {
        state.isSleeping = false;
        botReady(client).catch(err => log(`Error setting ready status: ${err}`, 'error', 'sleeping.js'));
    }

    let msUntilNextEvent;
    let nextAction;

    if (state.isSleeping) {
        msUntilNextEvent = wakeTime - currentTimeMs;
        if (msUntilNextEvent <= 0) {
            msUntilNextEvent += dayInMs;
        }
        log(`Bot is sleeping, waking up at: ${formatDuration(msUntilNextEvent)}`, 'info', 'sleeping.js');

        nextAction = () => {
            log('Bot is now awake', 'info', 'sleeping.js');
            state.isSleeping = false;
            state.sleepCycleTimer = null;
            botReady(client).catch(err => log(`Error setting ready status on wake: ${err}`, 'error', 'sleeping.js'));
            scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
        };

    } else {
        msUntilNextEvent = sleepTime - currentTimeMs;
        if (msUntilNextEvent <= 0) {
            msUntilNextEvent += dayInMs;
        }
        log(`Bot is awake, sleeping at: ${formatDuration(msUntilNextEvent)}`, 'info', 'sleeping.js');

        nextAction = () => {
            log('Bot is now sleeping', 'info', 'sleeping.js');
            state.isSleeping = true;
            state.sleepCycleTimer = null;
            botSleeping(client, wakeTimeStr).catch(err => log(`Error setting sleeping status on sleep: ${err}`, 'error', 'sleeping.js'));
            scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
        };
    }

    if (msUntilNextEvent < 0) msUntilNextEvent = 0;

    state.sleepCycleTimer = setTimeout(nextAction, msUntilNextEvent);
}

/**
 * humánus olvasható formába formázza az időt
 * @param {number} ms - milisec
 * @returns {string} - szexi formátum
 */
function formatDuration(ms) {
    if (ms < 0) ms = 0; // handle rollowers
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = schedSleep;
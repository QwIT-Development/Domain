/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const state = require('../initializers/state');
const log = require('../utils/betterLogs');
const { botReady, botSleeping } = require('./botReady');
const { changeSpinnerText } = require('../utils/processInfo');

/**
 * range alapjan elkezdi a sleep beallitasat (ajanlatos configbol szulni)
 * @param {string} range - formatum: `10:00-11:00` (ennyit alszok en is)
 * @param {*} client
 * @returns {boolean} - ha fasza minden truet ad ~~(ha nem akkor nem)~~
 */
function schedSleep(range, client) {
    changeSpinnerText("Scheduling sleep...").then();

    try {
        const [start, end] = range.split('-').map(t => t.trim());

        if (!start || !end) {
            log(`Invalid range format: ${range}, expected: 10:00-11:00`, 'error', 'sleeping.js');
            return false;
        }

        const startTime = parseTime(start);
        const endTime = parseTime(end);

        if (!startTime || !endTime) {
            log(`Invalid time values in range: ${range}`, 'error', 'sleeping.js');
            return false;
        }

        scheduleSleepCycle(startTime, endTime, client, end);
        log(`Sleep schedule set: ${start} - ${end}`, 'info', 'sleeping.js');
        return true;
    } catch (error) {
        log(`Error scheduling sleep: ${error.message}`, 'error', 'sleeping.js');
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
    const now = new Date();
    const midnight = new Date(now).setHours(0, 0, 0, 0);
    const currentTimeMs = now.getTime() - midnight;
    const dayInMs = 24 * 60 * 60 * 1000;

    const isOvernight = sleepTime > wakeTime;
    let shouldBeSleeping = false;

    if (isOvernight) {
        // ejszakai idokre (e.g., 22:00-06:00)
        shouldBeSleeping = currentTimeMs >= sleepTime || currentTimeMs < wakeTime;
    } else {
        // egynapos idore (e.g., 01:00-05:00)
        shouldBeSleeping = currentTimeMs >= sleepTime && currentTimeMs < wakeTime;
    }

    let msUntilSleep = sleepTime - currentTimeMs;
    let msUntilWake = wakeTime - currentTimeMs;
    if (msUntilSleep <= 0) msUntilSleep += dayInMs;
    if (msUntilWake <= 0) msUntilWake += dayInMs;

    const sleepDuration = isOvernight
        ? (dayInMs - sleepTime) + wakeTime
        : wakeTime - sleepTime;

    if (shouldBeSleeping) {
        // domainnak csucsukalnia kene, de valamilyen okon folytan nem alszik (rosz)
        if (!state.isSleeping) {
            state.isSleeping = true;
            botSleeping(client, wakeTimeStr).then();
            log('Bot is now sleeping', 'info', 'sleeping.js');
        }

        // sched wake up
        const wakeupIn = msUntilWake;
        log(`Bot will wake up in ${formatDuration(wakeupIn)}`, 'info', 'sleeping.js');

        // clear duplicate states
        if (state.sleepTimer) clearTimeout(state.sleepTimer);
        if (state.wakeTimer) clearTimeout(state.wakeTimer);

        setTimeout(() => {
            state.isSleeping = false;
            botReady(client).then();
            log('Bot is now awake', 'info', 'sleeping.js');

            scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
        }, wakeupIn);
    } else {
        if (state.isSleeping) {
            state.isSleeping = false;
            botReady(client).then();
            log('Bot is now awake', 'info', 'sleeping.js');
        }

        log(`Bot will sleep in ${formatDuration(msUntilSleep)}`, 'info', 'sleeping.js');

        if (state.sleepTimer) clearTimeout(state.sleepTimer);
        if (state.wakeTimer) clearTimeout(state.wakeTimer);

        setTimeout(() => {
            state.isSleeping = true;
            botSleeping(client, wakeTimeStr).then();
            log('Bot is now sleeping', 'info', 'sleeping.js');

            setTimeout(() => {
                state.isSleeping = false;
                botReady(client).then();
                log('Bot is now awake', 'info', 'sleeping.js');

                scheduleSleepCycle(sleepTime, wakeTime, client, wakeTimeStr);
            }, sleepDuration);
        }, msUntilSleep);
    }
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

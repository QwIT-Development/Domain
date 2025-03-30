const state = require('../initializers/state');
const log = require('../utils/betterLogs');

/**
 * range alapjan elkezdi a sleep beallitasat (ajanlatos configbol szulni)
 * @param {string} range - formatum: `10:00-11:00` (ennyit alszok en is)
 * @returns {boolean} - ha fasza minden truet ad ~~(ha nem akkor nem)~~
 */
function schedSleep(range) {
    //elmeletben asynceles nelkul is mukszik
    try {
        const [start, end] = range.split('-').map(t => t.trim()); // ha netan telebasznad spaceval

        if (!start || !end) {
            log(`Invalid range format: ${range}, consider this: 10:00-11:00`, 'error', 'sleeping.js');
            return false;
        }

        const startT = parseTime(start);
        const endT = parseTime(end);

        if (!startT || !endT) {
            log(`Invalid range format: ${range}, consider this: 10:00-11:00`, 'error', 'sleeping.js');
            return false;
        }

        nextSleep(endT, startT);
        log(`Schedule set: ${start} - ${end}`, 'info', 'sleeping.js');
        return true;
    } catch (error) {
        log(`Error scheduling sleep: ${error.message}`, 'error', 'sleeping.js');
        return false;
    }
}

/**
 * parseli az idő stringet
 * @param {string} str - format (`10:00`)
 * @returns {number|null} - millisec éfjéltől számolva
 */
function parseTime(str) {
    try {
        const timeRegex = /(\d{1,2}):(\d{2})/; // regex my beloved
        const matches = str.match(timeRegex);

        if (!matches) return null;

        let hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            log(`Invalid time: ${str}, are you sure this right?`, 'error', 'sleeping.js');
            return null;
        }

        return (hours * 60 + minutes) * 60 * 1000;
    } catch (error) {
        log(`Error parsing time string: ${str}`, 'error', 'sleeping.js');
        return null;
    }
}

/**
 * Következő "csicsikálási" eventet beállítja
 * @param {number} sleep - start time ms
 * @param {number} wake - end tiem ms
 */
function nextSleep(sleep, wake) {
    const now = new Date();
    const midnight = new Date(now).setHours(0, 0, 0, 0);
    const current = now.getTime() - midnight;

    let untilSleep = sleep - current;
    let untilWake = wake - current;

    if (untilSleep <= 0) untilSleep += 86400000; // 24 * 60 * 60 * 1000
    if (untilWake <= 0) untilWake += 86400000;

    const sleepTime = wake > sleep
        ? wake - sleep
        : wake + 86400000 - sleep;

    // check if bot should sleep rn
    // restartoknal jo
    const inSleepTime =
        (sleep < wake && current >= sleep && current < wake) ||
        (sleep > wake && (current >= sleep || current < wake));

    if (inSleepTime) {
        state.isSleeping = true;
        log('Sent bot to sleep, bc it should sleep', 'warn', 'sleeping.js');

        setTimeout(() => {
            state.isSleeping = false;
            log('Waked up bot', 'info', 'sleeping.js');
            nextSleep(sleep, wake);
        }, untilWake);
    } else {
        state.isSleeping = false;

        setTimeout(() => {
            state.isSleeping = true;
            log('Bot is now sleeping (normally)', 'info', 'sleeping.js');

            setTimeout(() => {
                state.isSleeping = false;
                log('Bot is now awake', 'info', 'sleeping.js');
                nextSleep(sleep, wake);
            }, sleepTime);
        }, untilSleep);
    }
}

module.exports = schedSleep;
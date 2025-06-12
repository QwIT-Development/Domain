/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const state = require('../initializers/state');
const Sentry = require('@sentry/bun');
const util = require('util');

const logMeta = {
    "info": { symbol: "", cssClass: "log-info" },
    "warn": { symbol: "⚠", cssClass: "log-warn" },
    "error": { symbol: "X", cssClass: "log-error" }
};

// https://colors.sh/
const colors = {
    "info": "\u001b[38;5;33m",
    "warn": "\u001b[38;5;208m",
    "error": "\u001b[38;5;15m\u001b[48;5;160m",
    // reserved
    "reset": "\u001b[0m"
};

const symbols = {
    "info": "",
    "warn": "⚠",
    "error": "X",
}

const consoleLog = console.log;
const loggerFile = __filename.split(/[\\/]/).pop();


function getCaller() {
    const prepStack = Error.prepareStackTrace;
    let callerFile;

    try {
        // ignore that err is not read, it should be there
        Error.prepareStackTrace = (err, stack) => stack;
        const err = new Error();
        const stack = err.stack;

        for (let i = 0; i < stack.length; i++) {
            const site = stack[i];
            if (!site) continue;

            const nameFromStack = site.getFileName();
            if (nameFromStack) {
                const baseFromStack = nameFromStack.split(/[\\/]/).pop();
                if (baseFromStack !== loggerFile) {
                    callerFile = baseFromStack;
                    break;
                }
            }
        }
    } catch (e) {
        consoleLog('Error getting caller filename:', e);
    } finally {
        Error.prepareStackTrace = prepStack;
    }
    return callerFile || "unknown";
}

// köszönöm szépen gemini a segítséget, hogy hogy kell intellij function kommentet írni
/**
 * Szexin loggol konzolra.\
 * Csak azert csinaltam mert nem tetszett a console.log
 *
 * @param {string|Error} messageOrError - üzenet vagy Error objektum
 * @param {string} [type="info"] - (`info`, `warn`, `error`)
 * @param {string} [thread="index.js"] - forrás
 *
 * @example
 * log("szia"); // alap infó, ami "index.js"-ből "jön"
 * log("jaj ne", "warn"); // "index.js"-ből jövő warn
 * log(new Error("rósz hiba"), "error", "kettospontharom.js"); // hiba specifikus forrásból
 */
function log(messageOrError, type = "info", thread = "index.js") {
    let consoleMessageString;
    let entryMessageString;

    if (messageOrError instanceof Error) {
        consoleMessageString = `${messageOrError.name || 'Error'}: ${messageOrError.message}`;
        entryMessageString = messageOrError.message || String(messageOrError);
    } else {
        consoleMessageString = String(messageOrError);
        entryMessageString = String(messageOrError);
    }

    consoleLog(`\r\x1b[K${colors[type]}${symbols[type]}[${thread.toUpperCase()}]: ${consoleMessageString}${colors.reset}`);

    const timestamp = formatHour(new Date());
    const logEntry = {
        timestamp: timestamp,
        type: type,
        thread: thread.toUpperCase(),
        message: entryMessageString,
        symbol: logMeta[type]?.symbol || '',
        cssClass: logMeta[type]?.cssClass || 'log-info'
    };
    state.logs.push(logEntry);
    if (state.logs.length > 100) {
        state.logs.shift();
    }

    if (type === 'error') {
        const errorToCapture = messageOrError instanceof Error ? messageOrError : new Error(String(messageOrError));
        Sentry.captureException(errorToCapture, {
            extra: { thread: thread }
        });
    }
}

function formatHour(date) {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${hour}:${minute}`;
}

// override all possible functions
console.log = (...args) => {
    const callingModule = getCaller();
    const message = util.format(...args);
    log(message, "info", callingModule);
};

console.warn = (...args) => {
    const callingModule = getCaller();
    const message = util.format(...args);
    log(message, "warn", callingModule);
};

console.error = (...args) => {
    const callingModule = getCaller();
    let itemToLog;
    const errorArgument = args.find(arg => arg instanceof Error);

    if (errorArgument) {
        itemToLog = errorArgument;
    } else {
        const messageString = util.format(...args);
        itemToLog = new Error(messageString);
    }

    log(itemToLog, "error", callingModule);
};

module.exports = log;
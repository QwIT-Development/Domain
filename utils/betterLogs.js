/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


// köszönöm szépen gemini a segítséget, hogy hogy kell intellij function kommentet írni
/**
 * Szexin loggol konzolra.\
 * Csak azert csinaltam mert nem tetszett a console.log
 *
 * @param {string} message - üzenet
 * @param {string} [type="info"] - (`info`, `infoWarn`, `warn`, `error`, `ignorableErr`)
 * @param {string} [thread="index.js"] - forrás
 *
 * @example
 * log("szia"); // alap infó, ami "index.js"-ből "jön"
 * log("jaj ne", "warn"); // "index.js"-ből jövő warn
 * log("rósz hiba", "error", "kettospontharom.js"); // hiba specifikus forrásból
 */
function log(message, type = "info", thread = "index.js") {
    // https://colors.sh/
    const colors = {
        "info": "\033[38;5;33m",
        "infoWarn": "\033[38;5;15m\033[48;5;7m",
        "warn": "\033[38;5;208m",
        "error": "\033[38;5;15m\033[48;5;160m",
        "ignorableErr": "\033[38;5;16m\033[48;5;7m",
        // reserved
        "reset": "\033[0m"
    };

    const symbols = {
        "info": "",
        "infoWarn": "⚠",
        "warn": "⚠",
        "error": "X",
        "ignorableErr": "?.."
    }
    console.log(`${colors[type]}${symbols[type]}[${thread.toUpperCase()}]: ${message}${colors.reset}`);
}

module.exports = log;
/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


function log(message, type = "info", thread = "index.js") {
    // https://colors.sh/
    const colors = {
        "info": "\033[38;5;33m",
        "infoWarn": "\033[38;5;15m\033[48;5;7m",
        "warn": "\033[38;5;208m",
        "error": "\033[38;5;15m\033[48;5;160m",
        // reserved
        "reset": "\033[0m"
    };

    const symbols = {
        "info": "",
        "infoWarn": "⚠",
        "warn": "⚠",
        "error": "X"
    }
    console.log(`${colors[type]}${symbols[type]}[${thread.toUpperCase()}]: ${message}${colors.reset}`);
}

module.exports = log;
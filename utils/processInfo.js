/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const log = require('./betterLogs')
let spinner = null;
// i got two colors one for the plug and one for the load
const darkGray = '\x1b[90m';
const reset = '\x1b[0m';

async function initializeSpinner(initialText = 'Initializing...') {
    if (spinner) return spinner;

    // I fucking hate ECMAScript importing
    const { default: ora } = await import('ora');

    spinner = ora({
        text: `${darkGray}${initialText}${reset}`,
        spinner: 'dots'
    }).start();

    return spinner;
}

async function changeSpinnerText(text) {
    if (!spinner) {
        return;
    }
    spinner.text = `${darkGray}${text}${reset}`;
}

async function stopSpinner(success = true, text = '') {
    if (!spinner) return;
    if (success) {
        spinner.succeed(text ? `${darkGray}${text}${reset}` : undefined);
    } else {
        const red = '\x1b[31m';
        spinner.fail(text ? `${red}${text}${reset}` : undefined);
    }
    spinner = null;
}

module.exports = {
    initializeSpinner,
    changeSpinnerText,
    stopSpinner
};
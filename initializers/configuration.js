const fs = require('fs');
const path = require('path');
const toml = require('toml');
const state = require('./state');
const log = require('../utils/betterLogs');

async function configurationChecker() {
    state.locationHelper.init = "configuration.js/configurationChecker";
    const configPath = path.join(global.dirname, 'config.toml');
    const templatePath = path.join(global.dirname, 'template.config.toml');
    let needsFullSetup = false;

    // check if config.toml is a dir (common docker problem)
    if (fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()) {
        fs.rmSync(configPath, { recursive: true, force: true });
        log(`config.toml was a directory, removed it.`, 'warn', 'Configuration');
    }

    if (!fs.existsSync(configPath)) {
        fs.copyFileSync(templatePath, configPath);
        log(`'config.toml' not found. Copied 'template.config.toml' to 'config.toml'.`, 'info', 'Configuration');
        log(`Please configure the bot by editing 'config.toml' and then restart the bot.`, 'warn', 'Configuration');
        needsFullSetup = true;
    } else {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = toml.parse(configData);
        if (config.NEEDS_SETUP) {
            log('Bot needs configuration. Please edit config.toml and restart.', 'info', 'Configuration');
            needsFullSetup = true;
        }
    }

    return needsFullSetup;
}

function loadConfig() {
    const configPath = path.join(global.dirname, 'config.toml');
    const configData = fs.readFileSync(configPath, 'utf-8');
    return toml.parse(configData);
}

module.exports = { configurationChecker, loadConfig };
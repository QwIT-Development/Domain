const fs = require('fs');
const path = require('path');
const log = require('../utils/betterLogs');

const defaultConfigValues = {
    "WEBUI_PORT": 4500,
    "NEEDS_FULL_SETUP": false
};

async function configurationChecker() {
    const configPath = path.join(global.dirname, 'config.json');
    let needsFullSetup = false;

    // check if config.json is a dif (common docker problem)
    if (fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()) {
        fs.unlinkSync(configPath);
        log(`config.json was a directory, removed it.`, 'warn', 'Configuration');
    }

    if (!fs.existsSync(configPath)) {
        const minimalConfig = {
            "WEBUI_PORT": defaultConfigValues.WEBUI_PORT,
            "NEEDS_FULL_SETUP": true
        };
        fs.writeFileSync(configPath, JSON.stringify(minimalConfig, null, 2));
        log(`Created initial config.json. Please configure the bot via WebUI (http://localhost:${minimalConfig.WEBUI_PORT}) and then restart the bot.`, 'warn', 'Configuration');
        needsFullSetup = true;
    } else {
        try {
            const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (currentConfig.NEEDS_FULL_SETUP === true) {
                log(`Bot requires full setup via WebUI (http://localhost:${currentConfig.WEBUI_PORT || defaultConfigValues.WEBUI_PORT}). Restart bot after setup.`, 'warn', 'Configuration');
                needsFullSetup = true;
            }
        } catch (e) {
            console.error(`Error reading config.json: ${e.message}. It might be corrupted.`);
            const backupPath = configPath + '.bak.' + Date.now();
            try {
                if(fs.existsSync(configPath)) fs.renameSync(configPath, backupPath);
                log(`Backed up corrupted config to ${backupPath}`, 'warn', 'Configuration');
            } catch (renameError) {
                console.error(`Could not back up corrupted config: ${renameError.message}`);
            }
            const minimalConfig = {
                "WEBUI_PORT": defaultConfigValues.WEBUI_PORT,
                "NEEDS_FULL_SETUP": true
            };
            fs.writeFileSync(configPath, JSON.stringify(minimalConfig, null, 2));
            log(`Created new minimal config.json due to previous error. Please configure via WebUI (http://localhost:${minimalConfig.WEBUI_PORT}) and restart.`, 'warn', 'Configuration');
            needsFullSetup = true;
        }
    }
    return needsFullSetup;
}

module.exports = { configurationChecker, defaultConfigValues };
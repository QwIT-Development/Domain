const fs = require('fs');
const path = require('path');

const saveConfig = async (req) => {
    try {
        const configData = await req.json();
        
        if (!configData.GEMINI_MODEL || !configData.ALIASES || !configData.CHANNELS) {
            return new Response(JSON.stringify({ error: 'Missing required configuration fields' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const configPath = path.join(global.dirname || process.cwd(), 'config.json');
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const updatedConfig = {
            ...currentConfig,
            GEMINI_MODEL: configData.GEMINI_MODEL,
            ALIASES: configData.ALIASES,
            CHANNELS: configData.CHANNELS,
            PROMPT_PATHS: configData.PROMPT_PATHS || {},
            LOCALE: configData.LOCALE || currentConfig.LOCALE,
            WIKI_URLS: configData.WIKI_URLS || currentConfig.WIKI_URLS,
            WEBUI_PORT: configData.WEBUI_PORT || currentConfig.WEBUI_PORT,
            OWNERS: configData.OWNERS || currentConfig.OWNERS,
            TIMINGS: configData.TIMINGS || currentConfig.TIMINGS,
            SEARX_BASE_URL: configData.SEARX_BASE_URL || currentConfig.SEARX_BASE_URL,
            EMOJIS: configData.EMOJIS || currentConfig.EMOJIS,
            MAX_MESSAGES: configData.MAX_MESSAGES || currentConfig.MAX_MESSAGES,
            SLEEPINGRANGE: configData.SLEEPINGRANGE || currentConfig.SLEEPINGRANGE,
            PROXIES: configData.PROXIES || currentConfig.PROXIES,
            REMOTE_LISTS: configData.REMOTE_LISTS || currentConfig.REMOTE_LISTS,
            ENABLE_THINKING: configData.ENABLE_THINKING !== undefined ? configData.ENABLE_THINKING : currentConfig.ENABLE_THINKING
        };

        if (configData.DISCORD_TOKEN && configData.DISCORD_TOKEN !== '***HIDDEN***') {
            updatedConfig.DISCORD_TOKEN = configData.DISCORD_TOKEN;
        }
        
        if (configData.GEMINI_API_KEY && configData.GEMINI_API_KEY !== '***HIDDEN***') {
            updatedConfig.GEMINI_API_KEY = configData.GEMINI_API_KEY;
        }

        const backupPath = configPath + '.backup.' + Date.now();
        fs.copyFileSync(configPath, backupPath);

        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Configuration saved successfully',
            backupPath: backupPath 
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        });
        
    } catch (error) {
        console.error('Error saving configuration:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to save configuration', 
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

module.exports = saveConfig;

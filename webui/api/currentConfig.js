const config = require('../../config.json');

const getCurrentConfig = async (req) => {    try {
        const safeConfig = {
            GEMINI_MODEL: config.GEMINI_MODEL,
            ALIASES: config.ALIASES || [],
            CHANNELS: config.CHANNELS || [],
            PROMPT_PATHS: config.PROMPT_PATHS || {},
            LOCALE: config.LOCALE,
            WIKI_URLS: config.WIKI_URLS || {},
            WEBUI_PORT: config.WEBUI_PORT,
            OWNERS: config.OWNERS || [],
            TIMINGS: config.TIMINGS || {},
            SEARX_BASE_URL: config.SEARX_BASE_URL,
            EMOJIS: config.EMOJIS || {},
            MAX_MESSAGES: config.MAX_MESSAGES,
            SLEEPINGRANGE: config.SLEEPINGRANGE,
            PROXIES: config.PROXIES || [],
            REMOTE_LISTS: config.REMOTE_LISTS || [],
            ENABLE_THINKING: config.ENABLE_THINKING,
            TOS_URL: config.TOS_URL,
            CUMULATIVE_MODE: config.CUMULATIVE_MODE,
            DISCORD_TOKEN: config.DISCORD_TOKEN ? '***HIDDEN***' : '',
            GEMINI_API_KEY: config.GEMINI_API_KEY ? '***HIDDEN***' : ''
        };

        return new Response(JSON.stringify(safeConfig), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        console.error('Error fetching current config:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

module.exports = getCurrentConfig;

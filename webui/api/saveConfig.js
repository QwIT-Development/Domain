const fs = require('fs');
const path = require('path');


function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function validateConfigData(data) {
    const errors = [];

    
    if (!data.GEMINI_MODEL) errors.push("Gemini Model ID is required.");
    if (!data.LOCALE) errors.push("Locale is required.");

    
    if (data.ALIASES && !data.ALIASES.every(alias => typeof alias === 'string' && alias.trim() !== '')) {
        errors.push("All Aliases must be non-empty strings.");
    }
    if (data.CHANNELS && !data.CHANNELS.every(ch => typeof ch === 'string' && ch.match(/^\d+$/))) {
        errors.push("All Channel IDs must be numeric strings.");
    }
    if (data.OWNERS && !data.OWNERS.every(owner => typeof owner === 'string' && owner.match(/^\d+$/))) {
        errors.push("All Owner User IDs must be numeric strings.");
    }

    
    if (data.PROMPT_PATHS) {
        for (const [channelId, promptFile] of Object.entries(data.PROMPT_PATHS)) {
            if (!channelId.match(/^\d+$/)) errors.push(`Invalid Channel ID in Prompt Paths: ${channelId}`);
            if (typeof promptFile !== 'string' || !promptFile.endsWith('.md')) errors.push(`Prompt file for channel ${channelId} must be a .md file: ${promptFile}`);
        }
    }

    
    if (data.WIKI_URLS) {
        for (const [channelId, urls] of Object.entries(data.WIKI_URLS)) {
            if (!channelId.match(/^\d+$/)) errors.push(`Invalid Channel ID in Wiki URLs: ${channelId}`);
            if (!Array.isArray(urls) || !urls.every(url => typeof url === 'string' && isValidUrl(url))) {
                errors.push(`All Wiki URLs for channel ${channelId} must be valid URLs.`);
            }
        }
    }
    if (data.WEBUI_PORT && (isNaN(parseInt(data.WEBUI_PORT)) || parseInt(data.WEBUI_PORT) < 1 || parseInt(data.WEBUI_PORT) > 65535)) {
        errors.push("WebUI Port must be a number between 1 and 65535.");
    }

    
    if (data.TIMINGS) {
        const { resetPrompt, saveReps, userCacheDuration } = data.TIMINGS;
        if (resetPrompt !== undefined && (isNaN(parseInt(resetPrompt)) || parseInt(resetPrompt) < 0)) {
            errors.push("Timing: Reset Prompt must be a non-negative number.");
        }
        if (saveReps !== undefined && (isNaN(parseInt(saveReps)) || parseInt(saveReps) < 0)) {
            errors.push("Timing: Save Reps must be a non-negative number.");
        }
        if (userCacheDuration !== undefined && (isNaN(parseInt(userCacheDuration)) || parseInt(userCacheDuration) < 0)) {
            errors.push("Timing: User Cache Duration must be a non-negative number.");
        }
    }

    if (data.SEARX_BASE_URL && (typeof data.SEARX_BASE_URL !== 'string' || !isValidUrl(data.SEARX_BASE_URL))) {
        errors.push("SearX Base URL must be a valid URL string.");
    }
    
    if (data.TOS_URL && (typeof data.TOS_URL !== 'string' || !isValidUrl(data.TOS_URL))) {
        errors.push("Terms of Service URL must be a valid URL string.");
    }

    
    if (data.EMOJIS) {
        Object.entries(data.EMOJIS).forEach(([key, value]) => {
            if (value && (typeof value !== 'string' || !value.match(/^\d+|<a?:\w+:\d+>$/))) {
                 errors.push(`Emoji ID for "${key}" is invalid: ${value}. Must be numeric ID or custom emoji format.`);
            }
        });
    }

    if (data.MAX_MESSAGES !== undefined && (isNaN(parseInt(data.MAX_MESSAGES)) || parseInt(data.MAX_MESSAGES) < 1)) {
        errors.push("Max Messages must be a positive integer.");
    }
    if (data.SLEEPINGRANGE && (typeof data.SLEEPINGRANGE !== 'string' || !data.SLEEPINGRANGE.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/))) {
        errors.push("Sleeping Range must be in HH:MM-HH:MM format (e.g., 22:00-06:00).");
    }

    
    if (data.PROXIES) {
        if (!Array.isArray(data.PROXIES)) {
            errors.push("Proxies must be an array.");
        } else {
            data.PROXIES.forEach((proxy, index) => {
                if (typeof proxy !== 'object' || proxy === null) {
                    errors.push(`Proxy #${index + 1}: Must be an object.`);
                    return;
                }
                if (!proxy.host || typeof proxy.host !== 'string') errors.push(`Proxy #${index + 1}: Host is required and must be a string.`);
                if (!proxy.port || isNaN(parseInt(proxy.port)) || parseInt(proxy.port) < 1 || parseInt(proxy.port) > 65535) {
                     errors.push(`Proxy #${index + 1}: Port is required and must be a number between 1 and 65535.`);
                }
                if (!proxy.protocol || typeof proxy.protocol !== 'string' || !['http', 'https', 'socks4', 'socks5'].includes(proxy.protocol)) {
                    errors.push(`Proxy #${index + 1}: Invalid or missing protocol.`);
                }
                if (proxy.auth && (typeof proxy.auth !== 'object' || proxy.auth === null || !proxy.auth.username || !proxy.auth.password)) {
                    errors.push(`Proxy #${index + 1}: Both username and password are required for proxy authentication if auth object is present.`);
                }
            });
        }
    }

    if (data.REMOTE_LISTS) {
        if (!Array.isArray(data.REMOTE_LISTS) || !data.REMOTE_LISTS.every(url => typeof url === 'string' && isValidUrl(url))) {
            errors.push("All Remote Block Lists must be valid URLs in an array.");
        }
    }
    
    if (data.CUMULATIVE_MODE && !["classic", "noise", "worse"].includes(data.CUMULATIVE_MODE)) {
        errors.push("Cumulative Mode must be one of 'classic', 'noise', or 'worse'.");
    }
    
    if (typeof data.ENABLE_THINKING !== 'boolean') {
        errors.push("Enable Thinking must be a boolean value.");
    }

    return errors;
}


const saveConfig = async (req) => {
    try {
        const configData = await req.json();
        
        const validationErrors = validateConfigData(configData);
        if (validationErrors.length > 0) {
            return new Response(JSON.stringify({ error: 'Invalid configuration data', details: validationErrors }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const configPath = path.join(global.dirname || process.cwd(), 'config.json');
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        
        const updatedConfig = {
            ...currentConfig, 
        };

        
        
        if (configData.DISCORD_TOKEN && configData.DISCORD_TOKEN !== '***HIDDEN***') {
            updatedConfig.DISCORD_TOKEN = configData.DISCORD_TOKEN;
        }
        if (configData.GEMINI_API_KEY && configData.GEMINI_API_KEY !== '***HIDDEN***') {
            updatedConfig.GEMINI_API_KEY = configData.GEMINI_API_KEY;
        }

        
        
        
        const fieldsToUpdate = [
            'GEMINI_MODEL', 'LOCALE', 'WEBUI_PORT', 'SEARX_BASE_URL', 
            'MAX_MESSAGES', 'SLEEPINGRANGE', 'ENABLE_THINKING', 'CUMULATIVE_MODE', 'TOS_URL'
        ];
        fieldsToUpdate.forEach(field => {
            if (configData[field] !== undefined) {
                updatedConfig[field] = configData[field];
            }
        });
        
        
        updatedConfig.ALIASES = configData.ALIASES !== undefined ? configData.ALIASES : currentConfig.ALIASES || [];
        updatedConfig.CHANNELS = configData.CHANNELS !== undefined ? configData.CHANNELS : currentConfig.CHANNELS || [];
        updatedConfig.PROMPT_PATHS = configData.PROMPT_PATHS !== undefined ? configData.PROMPT_PATHS : currentConfig.PROMPT_PATHS || {};
        updatedConfig.WIKI_URLS = configData.WIKI_URLS !== undefined ? configData.WIKI_URLS : currentConfig.WIKI_URLS || {};
        updatedConfig.OWNERS = configData.OWNERS !== undefined ? configData.OWNERS : currentConfig.OWNERS || [];
        updatedConfig.TIMINGS = configData.TIMINGS !== undefined ? configData.TIMINGS : currentConfig.TIMINGS || {};
        updatedConfig.EMOJIS = configData.EMOJIS !== undefined ? configData.EMOJIS : currentConfig.EMOJIS || {};
        updatedConfig.PROXIES = configData.PROXIES !== undefined ? configData.PROXIES : currentConfig.PROXIES || [];
        updatedConfig.REMOTE_LISTS = configData.REMOTE_LISTS !== undefined ? configData.REMOTE_LISTS : currentConfig.REMOTE_LISTS || [];

        updatedConfig.NEEDS_FULL_SETUP = false;

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

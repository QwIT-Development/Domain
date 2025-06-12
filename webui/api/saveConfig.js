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

function validateOptionalUrlString(value, propertyName, errors) {
    if (value && (typeof value !== 'string' || !isValidUrl(value))) {
        errors.push(`${propertyName} must be a valid URL string.`);
    }
}

function validateNumericStringArray(value, itemDescription, errors) {
    if (value && (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.match(/^\d+$/)))) {
        errors.push(`All ${itemDescription} must be numeric strings in an array.`);
    }
}

function validateNonEmptyStringArray(value, itemDescription, errors) {
    if (value && (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.trim() !== ''))) {
        errors.push(`All ${itemDescription} must be non-empty strings in an array.`);
    }
}

function validatePortNumber(value, propertyName, errors) {
    if (value !== undefined && (isNaN(parseInt(value)) || parseInt(value) < 1 || parseInt(value) > 65535)) {
        errors.push(`${propertyName} must be a number between 1 and 65535.`);
    }
}

function validateTimingValue(value, propertyNameInMessage, errors) {
    if (value !== undefined && (isNaN(parseInt(value)) || parseInt(value) < 0)) {
        errors.push(`Timing: ${propertyNameInMessage} must be a non-negative number.`);
    }
}

function validateUrlArray(value, itemDescription, errors) {
    if (value && (!Array.isArray(value) || !value.every(url => typeof url === 'string' && isValidUrl(url)))) {
        errors.push(`All ${itemDescription} must be valid URLs in an array.`);
    }
}

function validateConfigData(data) {
    const errors = [];

    if (!data.GEMINI_MODEL) errors.push("Gemini Model ID is required.");
    if (!data.LOCALE) errors.push("Locale is required.");

    validateNonEmptyStringArray(data.ALIASES, "Aliases", errors);
    validateNumericStringArray(data.CHANNELS, "Channel IDs", errors);
    validateNumericStringArray(data.OWNERS, "Owner User IDs", errors);

    if (data.PROMPT_PATHS) {
        for (const [channelId, promptFile] of Object.entries(data.PROMPT_PATHS)) {
            if (!channelId.match(/^\d+$/)) errors.push(`Invalid Channel ID in Prompt Paths: ${channelId}`);
            if (typeof promptFile !== 'string' || !promptFile.endsWith('.md')) errors.push(`Prompt file for channel ${channelId} must be a .md file: ${promptFile}`);
        }
    }

    if (data.WIKI_URLS) {
        for (const [channelId, urls] of Object.entries(data.WIKI_URLS)) {
            if (!channelId.match(/^\d+$/)) errors.push(`Invalid Channel ID in Wiki URLs: ${channelId}`);
            validateUrlArray(urls, `Wiki URLs for channel ${channelId}`, errors);
        }
    }

    validatePortNumber(data.WEBUI_PORT, "WebUI Port", errors);

    if (data.TIMINGS) {
        const { resetPrompt, saveReps, userCacheDuration } = data.TIMINGS;
        validateTimingValue(resetPrompt, "Reset Prompt", errors);
        validateTimingValue(saveReps, "Save Reps", errors);
        validateTimingValue(userCacheDuration, "User Cache Duration", errors);
    }

    validateOptionalUrlString(data.SEARX_BASE_URL, "SearX Base URL", errors);
    validateOptionalUrlString(data.TOS_URL, "Terms of Service URL", errors);

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

    validateUrlArray(data.REMOTE_LISTS, "Remote Block Lists", errors);

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

        const updatedConfig = { ...currentConfig };

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

        const complexFieldsToUpdate = [
            { name: 'ALIASES', defaultFallback: [] },
            { name: 'CHANNELS', defaultFallback: [] },
            { name: 'PROMPT_PATHS', defaultFallback: {} },
            { name: 'WIKI_URLS', defaultFallback: {} },
            { name: 'OWNERS', defaultFallback: [] },
            { name: 'TIMINGS', defaultFallback: {} },
            { name: 'EMOJIS', defaultFallback: {} },
            { name: 'PROXIES', defaultFallback: [] },
            { name: 'REMOTE_LISTS', defaultFallback: [] }
        ];

        complexFieldsToUpdate.forEach(fieldInfo => {
            if (configData[fieldInfo.name] !== undefined) {
                updatedConfig[fieldInfo.name] = configData[fieldInfo.name];
            } else {
                updatedConfig[fieldInfo.name] = currentConfig[fieldInfo.name] || fieldInfo.defaultFallback;
            }
        });

        updatedConfig.NEEDS_FULL_SETUP = false;

        fs.mkdirSync(path.join(global.dirname, "/data/running/tmp"), { recursive: true });

        const backupPath = path.join(global.dirname, "/data/running/tmp", "config.json" + '.backup.' + Date.now().toString());

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

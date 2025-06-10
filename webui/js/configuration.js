let currentConfig = null;
let availablePrompts = []; 


document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentConfig();
    await fetchAvailablePrompts(); 
    populateConfigForm();
});


function showAlert(message, type = 'info', duration = 5000) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.appendChild(alertDiv);

    if (duration) {
        setTimeout(() => {
            const bootstrapAlert = bootstrap.Alert.getInstance(alertDiv);
            if (bootstrapAlert) {
                bootstrapAlert.close();
            } else if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, duration);
    }
}


async function loadCurrentConfig() {
    const loadButton = document.querySelector('button[onclick="loadCurrentConfig()"]');
    const originalText = loadButton?.innerHTML;
    if (loadButton) {
        loadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loadButton.disabled = true;
    }

    try {
        const response = await fetch('/api/currentConfig');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentConfig = await response.json();
        if (currentConfig) {
            populateConfigForm();
            showAlert('Configuration loaded successfully.', 'success');
        } else {
            showAlert('Failed to load configuration: Empty response.', 'danger');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showAlert(`Error loading configuration: ${error.message}`, 'danger');
        currentConfig = {}; 
    } finally {
        if (loadButton) {
            loadButton.innerHTML = originalText;
            loadButton.disabled = false;
        }
    }
}

async function saveConfiguration() {
    const saveButton = document.querySelector('button[onclick="saveConfiguration()"]');
    const originalText = saveButton?.innerHTML;
    if (saveButton) {
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        saveButton.disabled = true;
    }

    const formData = collectFormData();
    const validation = validateConfiguration(formData);

    if (!validation.isValid) {
        showAlert(`Validation Error: ${validation.errors.join('<br>')}`, 'danger', 10000);
        if (saveButton) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
        return;
    }

    try {
        const response = await fetch('/api/saveConfig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }
        showAlert('Configuration saved successfully!', 'success');
        await loadCurrentConfig(); 
    } catch (error) {
        console.error('Error saving configuration:', error);
        showAlert(`Error saving configuration: ${error.message}`, 'danger');
    } finally {
        if (saveButton) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
    }
}


function populateConfigForm() {
    if (!currentConfig) {
        showAlert('Cannot populate form: Configuration not loaded.', 'warning');
        return;
    }

    
    populateField('discordToken', currentConfig.DISCORD_TOKEN, 'Current token is set (hidden for security)');
    populateField('geminiAPIKey', currentConfig.GEMINI_API_KEY, 'Current API key is set (hidden for security)');
    populateField('geminiModel', currentConfig.GEMINI_MODEL);
    populateArrayInput('aliasesContainer', currentConfig.ALIASES || [], 'addAliasInput', 'Alias');

    
    populateArrayInput('channelsContainer', currentConfig.CHANNELS || [], 'addChannelInput', 'Channel ID');
    populatePromptPaths(currentConfig.PROMPT_PATHS || {});
    populateWikiUrls(currentConfig.WIKI_URLS || {});

    
    populateField('locale', currentConfig.LOCALE);
    populateField('maxMessages', currentConfig.MAX_MESSAGES);
    populateField('sleepingRange', currentConfig.SLEEPINGRANGE);
    populateField('cumulativeMode', currentConfig.CUMULATIVE_MODE);
    populateCheckbox('enableThinking', currentConfig.ENABLE_THINKING);

    
    populateField('webuiPort', currentConfig.WEBUI_PORT);
    populateField('searxBaseUrl', currentConfig.SEARX_BASE_URL);
    populateField('tosUrl', currentConfig.TOS_URL); 
    populateArrayInput('ownersContainer', currentConfig.OWNERS || [], 'addOwnerInput', 'Owner User ID');
    populateTimings(currentConfig.TIMINGS || {});
    populateEmojis(currentConfig.EMOJIS || {});
    populateArrayInput('remoteListsContainer', currentConfig.REMOTE_LISTS || [], 'addRemoteListInput', 'Remote List URL', 'url');
    populateProxies(currentConfig.PROXIES || []);

    
    updateAllDynamicDropdowns();
}

function populateField(fieldId, value, placeholderIfSet = '') {
    const input = document.getElementById(fieldId);
    if (input) {
        if (input.type === 'password' && value) {
            input.placeholder = placeholderIfSet || 'Current value is set (hidden)';
            input.value = ''; 
        } else if (value !== undefined && value !== null) {
            input.value = value;
        } else {
            input.value = ''; 
        }
    }
}

function populateCheckbox(fieldId, value) {
    const input = document.getElementById(fieldId);
    if (input) {
        input.checked = !!value;
    }
}

function populateArrayInput(containerId, values, addFunctionName, placeholder, inputType = 'text') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 

    values.forEach(value => {
        const inputGroup = createRemovableInput(value, placeholder, inputType, () => {}); 
        container.appendChild(inputGroup);
    });
}

function populateTimings(timings) {
    populateField('timingSaveReps', timings.saveReps);
    populateField('timingResetPrompt', timings.resetPrompt);
    populateField('timingUserCacheDuration', timings.userCacheDuration);
}

function populateEmojis(emojis) {
    populateField('emojiUploaded', emojis.uploaded);
    populateField('emojiUpvote', emojis.upvote);
    populateField('emojiDownvote', emojis.downvote);
    populateField('emojiSearch', emojis.search);
    populateField('emojiMute', emojis.mute);
    populateField('emojiUploading', emojis.uploading);
}


function createRemovableInput(value, placeholder, inputType = 'text', onRemoveCallback = null) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    const input = document.createElement('input');
    input.type = inputType;
    input.className = 'form-control';
    input.placeholder = placeholder;
    input.value = value || '';
    div.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-danger';
    button.textContent = 'Remove';
    button.onclick = () => {
        div.remove();
        if (onRemoveCallback) onRemoveCallback();
    };
    div.appendChild(button);
    return div;
}

window.addAliasInput = () => addGenericInput('aliasesContainer', 'Alias');
window.addChannelInput = () => {
    addGenericInput('channelsContainer', 'Channel ID');
    updateAllDynamicDropdowns(); 
};
window.addOwnerInput = () => addGenericInput('ownersContainer', 'Owner User ID');
window.addRemoteListInput = () => addGenericInput('remoteListsContainer', 'Remote List URL', 'url');

function addGenericInput(containerId, placeholder, inputType = 'text') {
    const container = document.getElementById(containerId);
    if (container) {
        container.appendChild(createRemovableInput('', placeholder, inputType));
    }
}


async function fetchAvailablePrompts() {
    try {
        const response = await fetch('/api/prompts'); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        availablePrompts = await response.json();
        if (!Array.isArray(availablePrompts)) {
            console.warn("Fetched prompts is not an array:", availablePrompts);
            availablePrompts = [];
        }
    } catch (error) {
        console.error('Error fetching available prompts:', error);
        showAlert('Could not fetch available prompt files. Prompt selection may be limited.', 'warning');
        availablePrompts = []; 
    }
}

function getChannelOptions() {
    const channelInputs = document.querySelectorAll('#channelsContainer input');
    const channels = Array.from(channelInputs).map(input => input.value.trim()).filter(Boolean);
    
    if (currentConfig?.CHANNELS) {
        currentConfig.CHANNELS.forEach(ch => {
            if (!channels.includes(ch)) channels.push(ch);
        });
    }
    return [...new Set(channels)]; 
}

function populateChannelDropdown(selectElement) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">Select Channel</option>';
    getChannelOptions().forEach(channelId => {
        const option = document.createElement('option');
        option.value = channelId;
        option.textContent = channelId;
        selectElement.appendChild(option);
    });
    selectElement.value = currentValue; 
}

function populatePromptDropdown(selectElement) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">Select Prompt</option>';
    availablePrompts.forEach(promptFile => {
        const option = document.createElement('option');
        option.value = promptFile;
        option.textContent = promptFile;
        selectElement.appendChild(option);
    });
    selectElement.value = currentValue; 
}

function updateAllDynamicDropdowns() {
    document.querySelectorAll('.channel-select').forEach(populateChannelDropdown);
    document.querySelectorAll('.prompt-select').forEach(populatePromptDropdown);
}


document.addEventListener('input', (event) => {
    if (event.target?.closest('#channelsContainer')) {
        updateAllDynamicDropdowns();
    }
});



function populatePromptPaths(promptPaths) {
    const container = document.getElementById('promptPathsContainer');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(promptPaths).forEach(([channelId, promptFile]) => {
        container.appendChild(createPromptPathMappingElement(channelId, promptFile));
    });
}

window.addPromptPathMapping = () => {
    const container = document.getElementById('promptPathsContainer');
    if (container) {
        container.appendChild(createPromptPathMappingElement());
    }
};

function createPromptPathMappingElement(channelId = '', promptFile = '') {
    const div = document.createElement('div');
    div.className = 'input-group mb-2';

    const channelSelect = document.createElement('select');
    channelSelect.className = 'form-control channel-select'; 
    populateChannelDropdown(channelSelect);
    channelSelect.value = channelId;

    const promptSelect = document.createElement('select');
    promptSelect.className = 'form-control prompt-select'; 
    populatePromptDropdown(promptSelect);
    promptSelect.value = promptFile;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.textContent = 'Remove';
    removeButton.onclick = () => div.remove();

    div.appendChild(channelSelect);
    div.appendChild(promptSelect);
    div.appendChild(removeButton);
    return div;
}


function populateWikiUrls(wikiUrls) {
    const container = document.getElementById('wikiUrlsContainer');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(wikiUrls).forEach(([channelId, urls]) => {
        container.appendChild(createWikiUrlMappingElement(channelId, urls));
    });
}

window.addWikiUrlMapping = () => {
    const container = document.getElementById('wikiUrlsContainer');
    if (container) {
        container.appendChild(createWikiUrlMappingElement());
    }
};

function createWikiUrlMappingElement(channelId = '', urls = []) {
    const div = document.createElement('div');
    div.className = 'mb-3 border p-2 rounded';

    const channelSelect = document.createElement('select');
    channelSelect.className = 'form-control mb-2 channel-select';
    populateChannelDropdown(channelSelect);
    channelSelect.value = channelId;

    const urlsTextarea = document.createElement('textarea');
    urlsTextarea.className = 'form-control';
    urlsTextarea.rows = 3;
    urlsTextarea.placeholder = 'Enter URLs, one per line';
    urlsTextarea.value = urls.join('\\n');

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger btn-sm mt-2';
    removeButton.textContent = 'Remove Mapping';
    removeButton.onclick = () => div.remove();

    div.appendChild(channelSelect);
    div.appendChild(urlsTextarea);
    div.appendChild(removeButton);
    return div;
}


function populateProxies(proxies) {
    const container = document.getElementById('proxiesContainer');
    if (!container) return;
    container.innerHTML = '';
    proxies.forEach(proxy => container.appendChild(createProxyElement(proxy)));
}

window.addProxyInput = () => {
    const container = document.getElementById('proxiesContainer');
    if (container) {
        container.appendChild(createProxyElement());
    }
};

function createProxyElement(proxy = {}) {
    const div = document.createElement('div');
    div.className = 'proxy-item border p-3 mb-3 rounded';
    div.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <label class="form-label">Host</label>
                <input type="text" class="form-control proxy-host" value="${proxy.host || ''}" placeholder="IP or Hostname">
            </div>
            <div class="col-md-3">
                <label class="form-label">Port</label>
                <input type="number" class="form-control proxy-port" value="${proxy.port || ''}" placeholder="Port">
            </div>
            <div class="col-md-3">
                <label class="form-label">Protocol</label>
                <select class="form-control proxy-protocol">
                    <option value="http" ${proxy.protocol === 'http' ? 'selected' : ''}>HTTP</option>
                    <option value="https" ${proxy.protocol === 'https' ? 'selected' : ''}>HTTPS</option>
                    <option value="socks4" ${proxy.protocol === 'socks4' ? 'selected' : ''}>SOCKS4</option>
                    <option value="socks5" ${proxy.protocol === 'socks5' ? 'selected' : ''}>SOCKS5</option>
                </select>
            </div>
        </div>
        <div class="row g-2 mt-2">
            <div class="col-md-6">
                <label class="form-label">Username (Optional)</label>
                <input type="text" class="form-control proxy-username" value="${proxy.auth?.username || ''}" placeholder="Username">
            </div>
            <div class="col-md-6">
                <label class="form-label">Password (Optional)</label>
                <input type="password" class="form-control proxy-password" value="${proxy.auth?.password || ''}" placeholder="Password">
            </div>
        </div>
        <button type="button" class="btn btn-danger btn-sm mt-3" onclick="this.closest('.proxy-item').remove()">Remove Proxy</button>
    `;
    return div;
}


function collectFormData() {
    const data = {};

    data.DISCORD_TOKEN = document.getElementById('discordToken').value.trim() || currentConfig.DISCORD_TOKEN; 
    data.GEMINI_API_KEY = document.getElementById('geminiAPIKey').value.trim() || currentConfig.GEMINI_API_KEY; 
    data.GEMINI_MODEL = document.getElementById('geminiModel').value.trim();

    data.ALIASES = collectArrayInputValues('aliasesContainer');
    data.CHANNELS = collectArrayInputValues('channelsContainer');

    data.PROMPT_PATHS = {};
    document.querySelectorAll('#promptPathsContainer .input-group').forEach(group => {
        const channel = group.querySelector('.channel-select').value;
        const prompt = group.querySelector('.prompt-select').value;
        if (channel && prompt) data.PROMPT_PATHS[channel] = prompt;
    });

    data.LOCALE = document.getElementById('locale').value.trim();

    data.WIKI_URLS = {};
    document.querySelectorAll('#wikiUrlsContainer .border').forEach(group => {
        const channel = group.querySelector('.channel-select').value;
        const urlsText = group.querySelector('textarea').value;
        if (channel && urlsText.trim()) {
            data.WIKI_URLS[channel] = urlsText.split('\\n').map(u => u.trim()).filter(Boolean);
        }
    });

    data.WEBUI_PORT = parseInt(document.getElementById('webuiPort').value) || undefined;
    data.TOS_URL = document.getElementById('tosUrl').value.trim() || undefined; 
    data.OWNERS = collectArrayInputValues('ownersContainer');

    data.TIMINGS = {
        saveReps: parseInt(document.getElementById('timingSaveReps').value) || undefined,
        resetPrompt: parseInt(document.getElementById('timingResetPrompt').value) || undefined,
        userCacheDuration: parseInt(document.getElementById('timingUserCacheDuration').value) || undefined,
    };
    
    Object.keys(data.TIMINGS).forEach(key => data.TIMINGS[key] === undefined && delete data.TIMINGS[key]);


    data.SEARX_BASE_URL = document.getElementById('searxBaseUrl').value.trim();
    data.EMOJIS = {
        uploaded: document.getElementById('emojiUploaded').value.trim(),
        upvote: document.getElementById('emojiUpvote').value.trim(),
        downvote: document.getElementById('emojiDownvote').value.trim(),
        search: document.getElementById('emojiSearch').value.trim(),
        mute: document.getElementById('emojiMute').value.trim(),
        uploading: document.getElementById('emojiUploading').value.trim(),
    };
     
    Object.keys(data.EMOJIS).forEach(key => data.EMOJIS[key] === '' && delete data.EMOJIS[key]);


    data.MAX_MESSAGES = parseInt(document.getElementById('maxMessages').value) || undefined;
    data.SLEEPINGRANGE = document.getElementById('sleepingRange').value.trim();
    
    data.PROXIES = [];
    document.querySelectorAll('#proxiesContainer .proxy-item').forEach(item => {
        const proxy = {
            host: item.querySelector('.proxy-host').value.trim(),
            port: item.querySelector('.proxy-port').value.trim(),
            protocol: item.querySelector('.proxy-protocol').value,
        };
        const username = item.querySelector('.proxy-username').value.trim();
        const password = item.querySelector('.proxy-password').value.trim();
        if (username || password) {
            proxy.auth = { username, password };
        }
        if (proxy.host && proxy.port) { 
            data.PROXIES.push(proxy);
        }
    });

    data.REMOTE_LISTS = collectArrayInputValues('remoteListsContainer');
    data.ENABLE_THINKING = document.getElementById('enableThinking').checked;
    data.CUMULATIVE_MODE = document.getElementById('cumulativeMode').value;

    
    if (data.ALIASES.length === 0) delete data.ALIASES;
    if (data.CHANNELS.length === 0) delete data.CHANNELS;
    if (Object.keys(data.PROMPT_PATHS).length === 0) delete data.PROMPT_PATHS;
    if (Object.keys(data.WIKI_URLS).length === 0) delete data.WIKI_URLS;
    if (data.OWNERS.length === 0) delete data.OWNERS;
    if (!data.TOS_URL) delete data.TOS_URL; 
    if (data.PROXIES.length === 0) delete data.PROXIES;
    if (data.REMOTE_LISTS.length === 0) delete data.REMOTE_LISTS;
    if (Object.keys(data.TIMINGS).length === 0) delete data.TIMINGS;
    if (Object.keys(data.EMOJIS).length === 0) delete data.EMOJIS;


    return data;
}

function collectArrayInputValues(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} input[type="text"], #${containerId} input[type="url"], #${containerId} input[type="number"]`);
    return Array.from(inputs).map(input => input.value.trim()).filter(Boolean);
}



function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function validateConfiguration(data) {
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
            if (!promptFile.endsWith('.md')) errors.push(`Prompt file for channel ${channelId} must be a .md file: ${promptFile}`);
        }
    }

    
    if (data.WIKI_URLS) {
        for (const [channelId, urls] of Object.entries(data.WIKI_URLS)) {
            if (!channelId.match(/^\d+$/)) errors.push(`Invalid Channel ID in Wiki URLs: ${channelId}`);
            if (!Array.isArray(urls) || !urls.every(isValidUrl)) {
                errors.push(`All Wiki URLs for channel ${channelId} must be valid URLs.`);
            }
        }
    }
    if (data.WEBUI_PORT && (isNaN(data.WEBUI_PORT) || data.WEBUI_PORT < 1 || data.WEBUI_PORT > 65535)) {
        errors.push("WebUI Port must be a number between 1 and 65535.");
    }

    
    if (data.TIMINGS) {
        if (data.TIMINGS.resetPrompt && (isNaN(data.TIMINGS.resetPrompt) || data.TIMINGS.resetPrompt < 0)) {
            errors.push("Timing: Reset Prompt must be a non-negative number.");
        }
         if (data.TIMINGS.saveReps && (isNaN(data.TIMINGS.saveReps) || data.TIMINGS.saveReps < 0)) {
            errors.push("Timing: Save Reps must be a non-negative number.");
        }
         if (data.TIMINGS.userCacheDuration && (isNaN(data.TIMINGS.userCacheDuration) || data.TIMINGS.userCacheDuration < 0)) {
            errors.push("Timing: User Cache Duration must be a non-negative number.");
        }
    }


    if (data.SEARX_BASE_URL && !isValidUrl(data.SEARX_BASE_URL)) {
        errors.push("SearX Base URL must be a valid URL.");
    }
    if (data.TOS_URL && !isValidUrl(data.TOS_URL)) { 
        errors.push("Terms of Service URL must be a valid URL.");
    }
    
    
    if (data.EMOJIS) {
        Object.entries(data.EMOJIS).forEach(([key, value]) => {
            if (value && !value.match(/^(\d+|<a?:\w+:\d+>)$/)) {
                 errors.push(`Emoji ID for "${key}" is invalid: ${value}. Must be numeric ID or custom emoji format.`);
            }
        });
    }


    if (data.MAX_MESSAGES && (isNaN(data.MAX_MESSAGES) || data.MAX_MESSAGES < 1)) {
        errors.push("Max Messages must be a positive integer.");
    }
    if (data.SLEEPINGRANGE && !data.SLEEPINGRANGE.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/gi)) {
        errors.push("Sleeping Range must be in HH:MM-HH:MM format (e.g., 22:00-06:00).");
    }

    
    if (data.PROXIES) {
        data.PROXIES.forEach((proxy, index) => {
            if (!proxy.host) errors.push(`Proxy #${index + 1}: Host is required.`);
            if (!proxy.port) errors.push(`Proxy #${index + 1}: Port is required.`);
            else if (isNaN(proxy.port) || proxy.port < 1 || proxy.port > 65535) {
                 errors.push(`Proxy #${index + 1}: Port must be a number between 1 and 65535.`);
            }
            if (!['http', 'https', 'socks4', 'socks5'].includes(proxy.protocol)) {
                errors.push(`Proxy #${index + 1}: Invalid protocol.`);
            }
            if (proxy.auth && (!proxy.auth.username || !proxy.auth.password)) {
                errors.push(`Proxy #${index + 1}: Both username and password are required for proxy authentication if auth object is present.`);
            }
        });
    }

    if (data.REMOTE_LISTS && !data.REMOTE_LISTS.every(isValidUrl)) {
        errors.push("All Remote Block Lists must be valid URLs.");
    }
    if (!["classic", "noise", "worse"].includes(data.CUMULATIVE_MODE)) {
        errors.push("Cumulative Mode must be one of 'classic', 'noise', or 'worse'.");
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

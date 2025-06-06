let currentConfig = null;

async function loadCurrentConfig() {
    const loadButton = document.querySelector('button[onclick="loadCurrentConfig()"]');
    const originalText = loadButton?.innerHTML;

    try {
        if (loadButton) {
            loadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
            loadButton.disabled = true;
        }

        const response = await fetch('/api/currentConfig');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentConfig = await response.json();
        populateConfigForm();

        const alertDiv = createAlert('Configuration loaded successfully!', 'success');
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
        setTimeout(() => alertDiv.remove(), 3000);
    } catch (error) {
        console.error('Error loading current configuration:', error);
        const alertDiv = createAlert('Failed to load current configuration. Please check the console for details.', 'danger');
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
        setTimeout(() => alertDiv.remove(), 5000);
    } finally {
        if (loadButton && originalText) {
            loadButton.innerHTML = originalText;
            loadButton.disabled = false;
        }
    }
}

function populateConfigForm() {
    if (!currentConfig) return;

    populateField('botToken', currentConfig.DISCORD_TOKEN, 'Current token is set (hidden for security)');
    populateField('geminiAPIKey', currentConfig.GEMINI_API_KEY, 'Current API key is set (hidden for security)');
    populateField('geminiModelId', currentConfig.GEMINI_MODEL);
    populateArrayField('aliasesContainer', 'aliases[]', currentConfig.ALIASES || []);
    populateArrayField('channelsContainer', 'channels[]', currentConfig.CHANNELS || []);
    populatePromptMappings();
    populateField('locale', currentConfig.LOCALE);
    populateField('webuiPort', currentConfig.WEBUI_PORT);
    populateField('maxMessages', currentConfig.MAX_MESSAGES);
    populateField('sleepingRange', currentConfig.SLEEPINGRANGE);
    populateField('searxBaseUrl', currentConfig.SEARX_BASE_URL);
    populateField('tosUrl', currentConfig.TOS_URL);
    populateField('cumulativeMode', currentConfig.CUMULATIVE_MODE);
    populateCheckbox('enableThinking', currentConfig.ENABLE_THINKING);
    populateArrayField('ownersContainer', 'owners[]', currentConfig.OWNERS || []);
    populateArrayField('remoteListsContainer', 'remoteLists[]', currentConfig.REMOTE_LISTS || []);
    populateEmojis(currentConfig.EMOJIS);
    populateTimings(currentConfig.TIMINGS);
    populateWikiMappings();
    populateProxies();

    setTimeout(() => {
        updateDropdowns();
    }, 100);
}

function populateField(fieldId, value, placeholder = '') {
    const input = document.getElementById(fieldId);
    if (input) {
        if (value === '***HIDDEN***') {
            input.placeholder = placeholder;
        } else {
            input.value = value || '';
        }
    }
}

function populateCheckbox(fieldId, value) {
    const input = document.getElementById(fieldId);
    if (input) {
        input.checked = !!value;
    }
}

function populateArrayField(containerId, fieldName, values) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    values.forEach(value => {
        const field = document.createElement('input');
        field.type = 'text';
        field.name = fieldName;
        field.value = value;
        field.className = 'form-control mb-2';
        container.appendChild(field);
    });
}

function populatePromptMappings() {
    const container = document.getElementById('promptMappingContainer');
    if (!container || !currentConfig.PROMPT_PATHS) return;

    container.innerHTML = '';
    Object.entries(currentConfig.PROMPT_PATHS).forEach(([channelId, promptId]) => {
        const mapping = createMappingElement(channelId, promptId, 'channelPromptMappings');
        container.appendChild(mapping);
    });

    // Ensure dropdowns reflect existing data
    updateDropdowns();

    // Ensure dropdowns are created even if PROMPT_PATHS is empty
    if (Object.keys(currentConfig.PROMPT_PATHS).length === 0) {
        const mapping = createMappingElement('', '', 'channelPromptMappings');
        container.appendChild(mapping);
    }
}

function populateWikiMappings() {
    const container = document.getElementById('wikiUrlContainer');
    if (!container || !currentConfig.WIKI_URLS) return;

    container.innerHTML = '';
    Object.entries(currentConfig.WIKI_URLS).forEach(([channelId, urls]) => {
        const mapping = createWikiMappingElement(channelId, urls);
        container.appendChild(mapping);
    });

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Wiki URL';
    addButton.className = 'btn btn-primary';
    addButton.onclick = () => {
        const newMapping = createWikiMappingElement('', []);
        container.appendChild(newMapping);
    };
    container.appendChild(addButton);
}

function createMappingElement(channelId, value, fieldName) {
    const mapping = document.createElement('div');
    mapping.className = 'mb-3';
    mapping.style.display = 'flex';
    mapping.style.gap = '8px';

    const channelSelect = document.createElement('select');
    channelSelect.name = `${fieldName}[][channelId]`;
    channelSelect.className = 'form-control';
    populateChannelDropdown(channelSelect);
    channelSelect.value = channelId;

    const valueField = document.createElement('select');
    valueField.name = `${fieldName}[][value]`;
    valueField.className = 'form-control';
    populatePromptDropdown(valueField);
    valueField.value = value;

    mapping.appendChild(channelSelect);
    mapping.appendChild(valueField);

    return mapping;
}

function createWikiMappingElement(channelId, urls) {
    const mapping = document.createElement('div');
    mapping.className = 'mb-3';
    mapping.style.display = 'flex';
    mapping.style.flexDirection = 'column';
    mapping.style.gap = '8px';

    const channelSelect = document.createElement('select');
    channelSelect.name = `wikiUrls[][channelId]`;
    channelSelect.className = 'form-control';
    populateChannelDropdown(channelSelect);
    channelSelect.value = channelId;

    const urlsTextarea = document.createElement('textarea');
    urlsTextarea.name = `wikiUrls[][urls]`;
    urlsTextarea.className = 'form-control';
    urlsTextarea.rows = 4;
    urlsTextarea.placeholder = 'Enter URLs separated by new lines';
    urlsTextarea.value = urls.join('\n');

    mapping.appendChild(channelSelect);
    mapping.appendChild(urlsTextarea);

    return mapping;
}

function populateChannelDropdown(selectElement) {
    selectElement.innerHTML = '<option value="">Select a channel...</option>';
    const channels = currentConfig?.CHANNELS || [];
    channels.forEach(channelId => {
        const option = document.createElement('option');
        option.value = channelId;
        option.textContent = channelId;
        selectElement.appendChild(option);
    });
}

function populatePromptDropdown(selectElement) {
    selectElement.innerHTML = '<option value="">Select a prompt...</option>';
    const availablePrompts = ['prompt.md', 'bongea.md'];
    availablePrompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt;
        option.textContent = prompt;
        selectElement.appendChild(option);
    });
}

function updateDropdowns() {
    document.querySelectorAll('.channel-select').forEach(populateChannelDropdown);
    document.querySelectorAll('.channel-select-wiki').forEach(populateChannelDropdown);
}

function populateEmojis(emojis) {
    if (!emojis) return;
    Object.entries(emojis).forEach(([type, id]) => {
        const input = document.querySelector(`input[name="emojis[${type}]"]`);
        if (input) input.value = id;
    });
}

function populateTimings(timings) {
    if (!timings) return;
    Object.entries(timings).forEach(([type, value]) => {
        const input = document.querySelector(`input[name="timings[${type}]"]`);
        if (input) input.value = value;
    });
}

function populateProxies() {
    const container = document.getElementById('proxyContainer');
    if (!container) return;

    container.innerHTML = '';
    const proxies = currentConfig.PROXIES || [];

    proxies.forEach((proxy, index) => {
        const proxyElement = createProxyElement(proxy, index);
        container.appendChild(proxyElement);
    });

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Proxy';
    addButton.className = 'btn btn-primary';
    addButton.onclick = () => {
        const newProxy = createProxyElement({}, container.children.length);
        container.appendChild(newProxy);
    };
    container.appendChild(addButton);
}

function createProxyElement(proxy, index) {
    const proxyElement = document.createElement('div');
    proxyElement.className = 'proxy-item';
    proxyElement.innerHTML = `
        <input type="text" name="proxies[${index}][host]" value="${proxy.host || ''}" class="form-control mb-2" placeholder="Host">
        <input type="number" name="proxies[${index}][port]" value="${proxy.port || ''}" class="form-control mb-2" placeholder="Port">
        <select name="proxies[${index}][protocol]" class="form-control mb-2">
            <option value="http" ${proxy.protocol === 'http' ? 'selected' : ''}>HTTP</option>
            <option value="https" ${proxy.protocol === 'https' ? 'selected' : ''}>HTTPS</option>
            <option value="socks4" ${proxy.protocol === 'socks4' ? 'selected' : ''}>SOCKS4</option>
            <option value="socks5" ${proxy.protocol === 'socks5' ? 'selected' : ''}>SOCKS5</option>
        </select>
        <input type="text" name="proxies[${index}][username]" value="${proxy.auth?.username || ''}" class="form-control mb-2" placeholder="Username">
        <input type="password" name="proxies[${index}][password]" value="${proxy.auth?.password || ''}" class="form-control mb-2" placeholder="Password">
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove();">Remove</button>
    `;
    return proxyElement;
}

function createAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;
    return alertDiv;
}

document.addEventListener('DOMContentLoaded', loadCurrentConfig);

window.saveConfiguration = async function () {
    let originalText = null;
    try {
        const validationErrors = validateConfiguration();
        if (validationErrors.length > 0) {
            console.error('Validation Errors:', validationErrors);
            const errorMessage = 'Please fix the following errors before saving:\n\n' +
                validationErrors.map(error => '• ' + error).join('\n');
            const alertDiv = createAlert(errorMessage.replace(/\n/g, '<br>'), 'warning');
            document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
            setTimeout(() => alertDiv.remove(), 8000);
            return;
        }

        const saveButton = document.querySelector('button[onclick="saveConfiguration()"]');
        if (saveButton) {
            originalText = saveButton.innerHTML;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
            saveButton.disabled = true;
        }

        const formData = collectFormData();

        const response = await fetch('/api/saveConfig', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            const alertDiv = createAlert('Configuration saved successfully!', 'success');
            document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
            setTimeout(() => alertDiv.remove(), 3000);

            await loadCurrentConfig();
        } else {
            const alertDiv = createAlert('Failed to save configuration: ' + (result.error || 'Unknown error'), 'danger');
            document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
            setTimeout(() => alertDiv.remove(), 5000);
        }
    } catch (error) {
        console.error('Error saving configuration:', error);
        const alertDiv = createAlert('Failed to save configuration. Please check the console for details.', 'danger');
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
        setTimeout(() => alertDiv.remove(), 5000);
    } finally {
        const saveButton = document.querySelector('button[onclick="saveConfiguration()"]');
        if (saveButton && originalText) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
    }
};


window.previewConfiguration = function () {
    try {
        const validationErrors = validateConfiguration();
        const formData = collectFormData();

        let previewHtml = '<h5>Configuration Preview</h5>';

        if (validationErrors.length > 0) {
            previewHtml += '<div class="alert alert-warning mb-3"><strong>Validation Errors:</strong><br>';
            previewHtml += validationErrors.map(error => '• ' + error).join('<br>');
            previewHtml += '</div>';
        }

        previewHtml += '<div class="row">';


        previewHtml += '<div class="col-md-6"><div class="card mb-3">';
        previewHtml += '<div class="card-header"><strong>Basic Configuration</strong></div>';
        previewHtml += '<div class="card-body">';
        previewHtml += '<p><strong>Gemini Model:</strong> ' + (formData.GEMINI_MODEL || 'Not set') + '</p>';
        previewHtml += '<p><strong>Bot Token:</strong> ' + (formData.DISCORD_TOKEN ? 'Set (hidden)' : 'Not changed') + '</p>';
        previewHtml += '<p><strong>API Key:</strong> ' + (formData.GEMINI_API_KEY ? 'Set (hidden)' : 'Not changed') + '</p>';
        previewHtml += '<p><strong>Locale:</strong> ' + (formData.LOCALE || 'Not set') + '</p>';
        previewHtml += '<p><strong>Web UI Port:</strong> ' + formData.WEBUI_PORT + '</p>';
        previewHtml += '<p><strong>Max Messages:</strong> ' + formData.MAX_MESSAGES + '</p>';
        previewHtml += '<p><strong>Sleeping Range:</strong> ' + formData.SLEEPINGRANGE + '</p>';
        previewHtml += '<p><strong>Search Base URL:</strong> ' + (formData.SEARX_BASE_URL || 'Not set') + '</p>';
        previewHtml += '<p><strong>Terms of Service URL:</strong> ' + (formData.TOS_URL || 'Not set') + '</p>';
        previewHtml += '<p><strong>Cumulative Mode:</strong> ' + formData.CUMULATIVE_MODE + '</p>';
        previewHtml += '<p><strong>Enable Thinking:</strong> ' + (formData.ENABLE_THINKING ? 'Yes' : 'No') + '</p>';
        previewHtml += '</div></div></div>';


        previewHtml += '<div class="col-md-6"><div class="card mb-3">';
        previewHtml += '<div class="card-header"><strong>Aliases &amp; Channels</strong></div>';
        previewHtml += '<div class="card-body">';
        previewHtml += '<p><strong>Aliases (' + formData.ALIASES.length + '):</strong><br>';
        previewHtml += formData.ALIASES.map(alias => '• ' + alias).join('<br>') || 'None';
        previewHtml += '</p>';
        previewHtml += '<p><strong>Channels (' + formData.CHANNELS.length + '):</strong><br>';
        previewHtml += formData.CHANNELS.map(channel => '• ' + channel).join('<br>') || 'None';
        previewHtml += '</p>';
        previewHtml += '<p><strong>Owners (' + formData.OWNERS.length + '):</strong><br>';
        previewHtml += formData.OWNERS.map(owner => '• ' + owner).join('<br>') || 'None';
        previewHtml += '</p></div></div></div>';

        previewHtml += '</div>';


        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <h5>Configuration Preview</h5>
                    <button type="button" class="custom-modal-close" onclick="this.closest('.custom-modal').remove();">&times;</button>
                </div>
                <div class="custom-modal-body" style="max-height: 70vh; overflow-y: auto;">
                    ${previewHtml}
                </div>
                <div class="custom-modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.custom-modal').remove();">Close</button>
                    <button type="button" class="btn btn-success" onclick="saveConfiguration(); this.closest('.custom-modal').remove();">Save Configuration</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error previewing configuration:', error);
        const alertDiv = createAlert('Failed to preview configuration. Please check the console for details.', 'danger');
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
        setTimeout(() => alertDiv.remove(), 5000);
    }
};

function collectFormData() {
    const data = {};


    data.GEMINI_MODEL = document.getElementById('geminiModelId')?.value || '';


    data.LOCALE = document.getElementById('locale')?.value || '';
    data.WEBUI_PORT = parseInt(document.getElementById('webuiPort')?.value) || 4500;
    data.MAX_MESSAGES = parseInt(document.getElementById('maxMessages')?.value) || 200;
    data.SLEEPINGRANGE = document.getElementById('sleepingRange')?.value || '22:30-6:00';
    data.SEARX_BASE_URL = document.getElementById('searxBaseUrl')?.value || '';
    data.TOS_URL = document.getElementById('tosUrl')?.value || '';
    data.CUMULATIVE_MODE = document.getElementById('cumulativeMode')?.value || 'classic';
    data.ENABLE_THINKING = document.getElementById('enableThinking')?.checked || false;


    const aliases = [];
    document.querySelectorAll('input[name="aliases[]"]').forEach(input => {
        if (input.value.trim()) {
            aliases.push(input.value.trim());
        }
    });
    data.ALIASES = aliases;


    const channels = [];
    document.querySelectorAll('input[name="channels[]"]').forEach(input => {
        if (input.value.trim()) {
            channels.push(input.value.trim());
        }
    });
    data.CHANNELS = channels;


    const owners = [];
    document.querySelectorAll('input[name="owners[]"]').forEach(input => {
        if (input.value.trim()) {
            owners.push(input.value.trim());
        }
    });
    data.OWNERS = owners;


    const remoteLists = [];
    document.querySelectorAll('input[name="remoteLists[]"]').forEach(input => {
        if (input.value.trim()) {
            remoteLists.push(input.value.trim());
        }
    });
    data.REMOTE_LISTS = remoteLists;
    const promptPaths = {};
    const channelSelects = document.querySelectorAll('select[name="channelPromptMappings[][channelId]"]');
    const promptSelects = document.querySelectorAll('select[name="channelPromptMappings[][value]"]');

    for (let i = 0; i < channelSelects.length; i++) {
        const channelId = channelSelects[i].value;
        const promptId = promptSelects[i]?.value;

        if (channelId && promptId) {
            promptPaths[channelId] = promptId;
        }
    }
    data.PROMPT_PATHS = promptPaths;
    const wikiUrls = {};
    const wikiChannelSelects = document.querySelectorAll('select[name="wikiUrls[][channelId]"]');
    const wikiUrlTextareas = document.querySelectorAll('textarea[name="wikiUrls[][urls]"]');

    for (let i = 0; i < wikiChannelSelects.length; i++) {
        const channelId = wikiChannelSelects[i].value;
        const urlsText = wikiUrlTextareas[i]?.value;

        if (channelId && urlsText && urlsText.trim()) {
            const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url);
            if (urls.length > 0) {
                wikiUrls[channelId] = urls;
            }
        }
    }
    data.WIKI_URLS = wikiUrls;

    const emojis = {};
    const emojiInputs = document.querySelectorAll('input[name^="emojis["]');
    emojiInputs.forEach(input => {
        const match = input.name.match(/emojis\[([^\]]+)\]/);
        if (match && input.value.trim()) {
            emojis[match[1]] = input.value.trim();
        }
    });
    data.EMOJIS = emojis;


    const timings = {};
    const timingInputs = document.querySelectorAll('input[name^="timings["]');
    timingInputs.forEach(input => {
        const match = input.name.match(/timings\[([^\]]+)\]/);
        if (match && input.value.trim()) {
            timings[match[1]] = parseInt(input.value.trim()) || 0;
        }
    });
    data.TIMINGS = timings;


    const proxies = [];
    const proxyItems = document.querySelectorAll('.proxy-item');
    proxyItems.forEach(proxyItem => {
        const host = proxyItem.querySelector('input[name="proxies[][host]"]')?.value?.trim();
        const port = proxyItem.querySelector('input[name="proxies[][port]"]')?.value?.trim();
        const protocol = proxyItem.querySelector('select[name="proxies[][protocol]"]')?.value;
        const username = proxyItem.querySelector('input[name="proxies[][username]"]')?.value?.trim();
        const password = proxyItem.querySelector('input[name="proxies[][password]"]')?.value?.trim();

        if (host && port) {
            const proxy = {
                host: host,
                port: port,
                protocol: protocol || 'http'
            };

            if (username || password) {
                proxy.auth = {};
                if (username) proxy.auth.username = username;
                if (password) proxy.auth.password = password;
            }

            proxies.push(proxy);
        }
    });
    data.PROXIES = proxies;


    const botToken = document.getElementById('botToken')?.value;
    const geminiApiKey = document.getElementById('geminiAPIKey')?.value;

    if (botToken && botToken.trim() && !botToken.includes('Current token is set')) {
        data.DISCORD_TOKEN = botToken.trim();
    }

    if (geminiApiKey && geminiApiKey.trim() && !geminiApiKey.includes('Current API key is set')) {
        data.GEMINI_API_KEY = geminiApiKey.trim();
    }    return data;
}

function createAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    return alertDiv;
}

function validateConfiguration() {
    const errors = [];


    const geminiModel = document.getElementById('geminiModelId')?.value;
    if (!geminiModel || geminiModel.trim() === '') {
        errors.push('Gemini Model is required');
    }


    const webuiPort = document.getElementById('webuiPort')?.value;
    if (webuiPort && (parseInt(webuiPort) < 1 || parseInt(webuiPort) > 65535)) {
        errors.push('Web UI Port must be between 1 and 65535');
    }


    const maxMessages = document.getElementById('maxMessages')?.value;
    if (maxMessages && parseInt(maxMessages) < 1) {
        errors.push('Max Messages must be greater than 0');
    }


    const sleepingRange = document.getElementById('sleepingRange')?.value;
    if (sleepingRange) {
        const rangeRegex = /^(\d{2}|\d{1}):\d{2}-(\d{2}|\d{1}):\d{2}$/;
        if (!rangeRegex.test(sleepingRange)) {
            errors.push('Sleeping Range must be in format HH:MM-HH:MM (e.g., 22:30-06:00)');
        } else {
            const [start, end] = sleepingRange.split('-');
            const [startHour, startMinute] = start.split(':').map(Number);
            const [endHour, endMinute] = end.split(':').map(Number);

            if (
                startHour < 0 || startHour > 23 ||
                startMinute < 0 || startMinute > 59 ||
                endHour < 0 || endHour > 23 ||
                endMinute < 0 || endMinute > 59
            ) {
                errors.push('Sleeping Range contains invalid time values');
            } else if (
                (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) &&
                !(startHour > endHour && endHour < startHour) // Allow ranges spanning midnight
            ) {
                errors.push('Sleeping Range start time must be earlier than end time');
            }
        }
    }


    const searxBaseUrl = document.getElementById('searxBaseUrl')?.value;
    if (searxBaseUrl && !isValidUrl(searxBaseUrl)) {
        errors.push('Search Base URL must be a valid URL');
    }


    const tosUrl = document.getElementById('tosUrl')?.value;
    if (tosUrl && !isValidUrl(tosUrl)) {
        errors.push('Terms of Service URL must be a valid URL');
    }


    const aliases = [];
    document.querySelectorAll('input[name="aliases[]"]').forEach(input => {
        if (input.value.trim()) {
            aliases.push(input.value.trim());
        }
    });
    if (aliases.length === 0) {
        errors.push('At least one alias is required');
    }


    const channels = [];
    document.querySelectorAll('input[name="channels[]"]').forEach(input => {
        if (input.value.trim()) {
            const channelId = input.value.trim();

            if (!/^\d{17,19}$/.test(channelId)) {
                errors.push(`Invalid channel ID format: ${channelId}`);
            } else {
                channels.push(channelId);
            }
        }
    });
    if (channels.length === 0) {
        errors.push('At least one channel is required');
    }


    document.querySelectorAll('input[name="owners[]"]').forEach(input => {
        if (input.value.trim()) {
            const ownerId = input.value.trim();
            if (!/^\d{17,19}$/.test(ownerId)) {
                errors.push(`Invalid owner ID format: ${ownerId}`);
            }
        }
    });


    document.querySelectorAll('input[name="remoteLists[]"]').forEach(input => {
        if (input.value.trim() && !isValidUrl(input.value.trim())) {
            errors.push(`Invalid remote list URL: ${input.value.trim()}`);
        }
    });


    document.querySelectorAll('input[name^="emojis["]').forEach(input => {
        if (input.value.trim() && !/^\d{17,19}$/.test(input.value.trim())) {
            const match = input.name.match(/emojis\[([^\]]+)\]/);
            const emojiType = match ? match[1] : 'unknown';
            errors.push(`Invalid emoji ID format for ${emojiType}: ${input.value.trim()}`);
        }
    });


    document.querySelectorAll('input[name^="timings["]').forEach(input => {
        if (input.value.trim()) {
            const value = parseInt(input.value.trim());
            if (isNaN(value) || value < 1) {
                const match = input.name.match(/timings\[([^\]]+)\]/);
                const timingType = match ? match[1] : 'unknown';
                errors.push(`Invalid timing value for ${timingType}: must be a positive number`);
            }
        }
    });
    document.querySelectorAll('.proxy-item').forEach((proxyItem, index) => {
        const host = proxyItem.querySelector('input[name="proxies[][host]"]')?.value?.trim();
        const port = proxyItem.querySelector('input[name="proxies[][port]"]')?.value?.trim();
        const username = proxyItem.querySelector('input[name="proxies[][username]"]')?.value?.trim();
        const password = proxyItem.querySelector('input[name="proxies[][password]"]')?.value?.trim();


        if (host || port || username || password) {
            if (!host) {
                errors.push(`Proxy ${index + 1}: Host is required when proxy is configured`);
            }
            if (!port) {
                errors.push(`Proxy ${index + 1}: Port is required when proxy is configured`);
            } else if (parseInt(port) < 1 || parseInt(port) > 65535) {
                errors.push(`Proxy ${index + 1}: Port must be between 1 and 65535`);
            }
        }
    });


    document.querySelectorAll('textarea[name="wikiUrls[][urls]"]').forEach((textarea, index) => {
        if (textarea.value.trim()) {
            const urls = textarea.value.split('\n').map(url => url.trim()).filter(url => url);
            urls.forEach(url => {
                if (!isValidUrl(url)) {
                    errors.push(`Invalid wiki URL in mapping ${index + 1}: ${url}`);
                }
            });
        }
    });
    const channelSelects = document.querySelectorAll('select[name="channelPromptMappings[][channelId]"]');
    const promptSelects = document.querySelectorAll('select[name="channelPromptMappings[][value]"]');
    const usedChannels = new Set();

    for (let i = 0; i < channelSelects.length; i++) {
        const channelId = channelSelects[i].value;
        const promptId = promptSelects[i]?.value;

        if (channelId && promptId) {
            if (usedChannels.has(channelId)) {
                errors.push(`Channel ${channelId} is mapped to multiple prompts`);
            }
            usedChannels.add(channelId);
        } else if (channelId && !promptId) {
            errors.push(`Channel ${channelId} is selected but no prompt is assigned`);
        } else if (!channelId && promptId) {
            errors.push(`Prompt ${promptId} is selected but no channel is assigned`);
        }
    }

    return errors;
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

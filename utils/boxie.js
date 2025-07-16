const SANDBOX_API_URL = 'http://boxie:5000/execute';
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
// yes, boxie is based on opensuse

/**
 * Executes a command in a boxie container.
 * @param {string[]} commandList - the command and arguments in a list example: ['zypper', '--non-interactive', 'info', 'htop']
 * @returns {Promise<object>} - execution result
 */
async function runCommandInSandbox(commandList) {
    // check for flag
    if (!config.ALLOW_SANDBOX) {
        return { error: 'Sandbox execution is disabled in the configuration.' };
    }

    const payload = { command: commandList };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
        const response = await fetch(SANDBOX_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const details = await response.json().catch(() => response.text());
            return { error: 'API Error', status: response.status, details };
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { error: 'Timeout Error', details: 'Request timed out.' };
        }
        return { error: 'Network Error', details: 'Could not connect to the sandbox API.' };
    }
}

runCommandInSandbox(commandToRun).then(result => {
    if (result.error) {
        console.error('Execution failed:', result);
    } else {
        console.log('STDOUT:', result.stdout);
    }
});
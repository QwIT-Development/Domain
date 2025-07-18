const SANDBOX_API_URL = "http://boxie:5000/execute";
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
// yes, boxie is based on opensuse

/**
 * Executes a command in a boxie container.
 * @param {string} commandString - the command and arguments in a list example: ['zypper', '--non-interactive', 'info', 'htop']
 * @returns {Promise<object>} - execution result
 */
async function runCommandInSandbox(commandString) {
  // check for flag
  if (!config.ALLOW_SANDBOX) {
    return { error: "Sandbox execution is disabled in the configuration." };
  }

  const payload = { command: commandString };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(SANDBOX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const details = await response.json().catch(() => response.text());
      return { error: "(sand)Boxie error", status: response.status, details };
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return {
        error: "Timeout Error",
        details: "An error occured while trying to contact Boxie.",
      };
    }
    return {
      error: "Network Error",
      details: "An error occured while trying to contact Boxie.",
    };
  }
}

module.exports = { runCommandInSandbox };

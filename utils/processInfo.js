/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

let spinner = null;
let spinnerTimeout = null;
let isShuttingDown = false;

// I got two colors one for the plug and one for the load
const darkGray = "\x1b[90m";
const reset = "\x1b[0m";

const DEFAULT_TIMEOUT = 1 * 30 * 1000;

function cleanupSpinner() {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = null;
  }
}

process.on("exit", cleanupSpinner);
process.on("SIGINT", () => {
  isShuttingDown = true;
  cleanupSpinner();
  process.exit(0);
});
process.on("SIGTERM", () => {
  isShuttingDown = true;
  cleanupSpinner();
  process.exit(0);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  cleanupSpinner();
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  cleanupSpinner();
  process.exit(1);
});

function setupTimeout(timeoutMs = DEFAULT_TIMEOUT) {
  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout);
  }

  spinnerTimeout = setTimeout(() => {
    if (spinner && !isShuttingDown) {
      stopSpinner(false, "Operation timed out");
    }
  }, timeoutMs);
}

async function initializeSpinner(
  initialText = "Initializing...",
  timeoutMs = DEFAULT_TIMEOUT,
) {
  if (spinner) return spinner;
  if (isShuttingDown) return null;

  try {
    const { default: ora } = await import("ora");

    spinner = ora({
      text: `${darkGray}${initialText}${reset}`,
      spinner: "dots",
    }).start();

    setupTimeout(timeoutMs);

    return spinner;
  } catch (error) {
    console.error("Failed to initialize spinner:", error);
    return null;
  }
}

async function changeSpinnerText(text, resetTimeout = true) {
  if (isShuttingDown) return;

  if (!spinner) {
    await initializeSpinner(text);
    return;
  }

  spinner.text = `${darkGray}${text}${reset}`;

  if (resetTimeout && spinnerTimeout) {
    setupTimeout();
  }
}

async function stopSpinner(success = true, text = "") {
  if (!spinner) return;

  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = null;
  }

  if (success) {
    spinner.succeed(text ? `${darkGray}${text}${reset}` : undefined);
  } else {
    const red = "\x1b[31m";
    spinner.fail(text ? `${red}${text}${reset}` : undefined);
  }
  spinner = null;
}

function forceStopSpinner() {
  cleanupSpinner();
}

function isSpinnerActive() {
  return spinner !== null;
}

function getRemainingTimeout() {
  return spinnerTimeout ? DEFAULT_TIMEOUT : 0;
}

module.exports = {
  initializeSpinner,
  changeSpinnerText,
  stopSpinner,
  forceStopSpinner,
  isSpinnerActive,
  getRemainingTimeout,
};

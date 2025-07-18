/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const log = require("./betterLogs");
const { changeSpinnerText } = require("../utils/processInfo");
const state = require("../initializers/state");

async function deleteArtifacts() {
  state.locationHelper.init = "cleanup.js/deleteArtifacts";
  await changeSpinnerText("Deleting Artifacts...");
  const artifactDir = path.join(global.dirname, "data", "running", "tmp");
  // check if it exists (in docker it does not)
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
    // return cus we don't have anything to delete
    return;
  }
  const files = fs.readdirSync(artifactDir);

  for (const file of files) {
    const filePath = path.join(artifactDir, file);
    if (fs.statSync(filePath).isFile() && file.startsWith("artifact_")) {
      fs.unlinkSync(filePath);
      log(`Deleted artifact: ${file}`, "info", "cleanup.js");
    }
  }
}

async function deleteUploadedItems() {
  state.locationHelper.init = "cleanup.js/deleteUploadedItems";
  await changeSpinnerText("Deleting Uploaded Items...");
  
  // For OpenAI implementation, we use Discord URLs directly, so no cleanup needed
  // Just clean up any temporary files that might exist
  const tmpDir = path.join(global.dirname, "data", "running", "tmp");
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      const filePath = path.join(tmpDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        log(`Deleted temporary file: ${file}`, "info", "cleanup.js");
      }
    }
  }
  
  log("OpenAI implementation uses Discord URLs - no remote file cleanup needed", "info", "cleanup.js");
}

module.exports = { deleteArtifacts, deleteUploadedItems };

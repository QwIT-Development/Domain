/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
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
  const fileIds = await getFileIds();
  if (!fileIds) {
    log("No fileIds found", "warn", "cleanup.js");
    return;
  }
  try {
    for (const fileId of fileIds) {
      await fileManager.deleteFile(fileId);
      log(`Deleted file with ID: ${fileId}`, "info", "cleanup.js");
    }
  } catch (error) {
    console.error(`Error deleting file with ID: ${error}`);
  }
}

async function getFileIds() {
  try {
    const fileListResponse = await fileManager.listFiles({ pageSize: 100 });

    if (fileListResponse.files && fileListResponse.files.length > 0) {
      return fileListResponse.files.map((file) => file.name);
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error listing files: ${error}`);
    return [];
  }
}

module.exports = { deleteArtifacts, deleteUploadedItems };

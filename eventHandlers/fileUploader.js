/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
const log = require("../utils/betterLogs");
const fs = require("fs");
const path = require("path");
const state = require("../initializers/state");

async function uploadFilesToGemini(message, client) {
  let files;
  if (message.attachments.size > 0) {
    const files1 = await Promise.all(
      Array.from(message.attachments.values()).map(async (attachment) => {
        if (!attachment.url) {
          console.error(`Invalid attachment URL: ${attachment}`);
          return null;
        }
        const fPath = path.join(
          global.dirname,
          "data",
          "running",
          "tmp",
          attachment.name,
        );
        try {
          await message.react(state.emojis["uploading"]);
          const response = await fetch(attachment.url);
          if (response.ok) {
            const fileBuffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(fPath, fileBuffer);
            const uploadedFile = await uploadToGemini(
              fPath,
              attachment.contentType,
            );
            fs.unlinkSync(fPath);
            await message.reactions.cache
              .find(
                (reaction) =>
                  reaction.emoji.id === state.emojis["uploading"].id,
              )
              ?.users.remove(client.user.id);
            await message.react(state.emojis["uploaded"]);
            return uploadedFile;
          } else {
            return null;
          }
        } catch (error) {
          console.error(`Error uploading file: ${error}`);
          return null;
        }
      }),
    );
    files = files1.filter((file) => file !== null);
  }
  if (!files) {
    return [];
  }
  return files;
}

async function uploadToGemini(fPath, mimeType) {
  const uploadResult = await fileManager.uploadFile(fPath, {
    mimeType,
    displayName: path.basename(fPath),
  });
  const file = uploadResult.file;
  log(`Uploaded file: ${file.name}`, "info", "fileUploader.js");
  return file;
}

module.exports = uploadFilesToGemini;

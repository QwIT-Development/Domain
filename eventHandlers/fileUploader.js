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

const MIME_TYPE_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

function getMimeType(filename, discordMimeType) {
  const ext = path.extname(filename).toLowerCase();
  const mappedType = MIME_TYPE_MAP[ext];

  if (mappedType) {
    return mappedType;
  }

  if (
    discordMimeType &&
    !discordMimeType.startsWith("image/") &&
    Object.keys(MIME_TYPE_MAP).includes(ext)
  ) {
    return mappedType;
  }

  return discordMimeType || "application/octet-stream";
}

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
            const correctedMimeType = getMimeType(
              attachment.name,
              attachment.contentType,
            );

            const uploadedFile = await uploadToGemini(fPath, correctedMimeType);
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
  try {
    const uploadResult = await fileManager.uploadFile(fPath, {
      mimeType,
      displayName: path.basename(fPath),
    });

    const file = uploadResult.file;
    log(
      `Successfully uploaded file: ${file.name} (URI: ${file.uri})`,
      "info",
      "fileUploader.js",
    );

    let fileStatus = await fileManager.getFile(file.name);
    while (fileStatus.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      fileStatus = await fileManager.getFile(file.name);
    }

    if (fileStatus.state === "FAILED") {
      throw new Error(`File processing failed: ${file.name}`);
    }

    return fileStatus;
  } catch (error) {
    log(
      `Error uploading file to Gemini: ${error.message}`,
      "error",
      "fileUploader.js",
    );
    throw error;
  }
}

module.exports = uploadFilesToGemini;

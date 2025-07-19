/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const log = require("../utils/betterLogs");
const fs = require("fs");
const path = require("path");
const state = require("../initializers/state");

const SUPPORTED_IMAGE_TYPES = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"
];

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_IMAGE_TYPES.includes(ext);
}

async function uploadFilesToOpenAI(message, client) {
  let files = [];
  
  if (message.attachments.size > 0) {
    const processedFiles = await Promise.all(
      Array.from(message.attachments.values()).map(async (attachment) => {
        if (!attachment.url) {
          console.error(`Invalid attachment URL: ${attachment}`);
          return null;
        }

        // For OpenAI, we can use image URLs directly for vision
        if (isImageFile(attachment.name)) {
          try {
            await message.react(state.emojis["uploading"]);
            
            // For OpenAI vision, we can use the Discord CDN URL directly
            const fileObject = {
              type: "image_url",
              image_url: {
                url: attachment.url,
                detail: "high" // Can be "low", "high", or "auto"
              }
            };

            await message.reactions.cache
              .find(
                (reaction) =>
                  reaction.emoji.id === state.emojis["uploading"].id,
              )
              ?.users.remove(client.user.id);
            await message.react(state.emojis["uploaded"]);
            
            log(
              `Successfully processed image: ${attachment.name}`,
              "info",
              "fileUploader.js",
            );
            
            return fileObject;
          } catch (error) {
            console.error(`Error processing file: ${error}`);
            return null;
          }
        } else {
          log(
            `Unsupported file type: ${attachment.name}. OpenAI vision only supports images.`,
            "warn",
            "fileUploader.js",
          );
          return null;
        }
      }),
    );
    
    files = processedFiles.filter((file) => file !== null);
  }
  
  return files;
}

module.exports = uploadFilesToOpenAI;

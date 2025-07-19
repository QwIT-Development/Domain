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
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
];

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_IMAGE_TYPES.includes(ext);
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Domain-Bot/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Image download timeout after 30 seconds");
    }
    throw error;
  }
}

function getImageMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "image/jpeg"; // fallback
  }
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

        // convert to base64
        if (isImageFile(attachment.name)) {
          try {
            await message.react(state.emojis["uploading"]);
            if (attachment.size > 20 * 1024 * 1024) {
              // 20mb max
              log(
                `Image ${attachment.name} is too large (${Math.round(attachment.size / 1024 / 1024)}MB). OpenAI vision supports up to 20MB.`,
                "warn",
                "fileUploader.js",
              );

              await message.reactions.cache
                .find(
                  (reaction) =>
                    reaction.emoji.id === state.emojis["uploading"].id,
                )
                ?.users.remove(client.user.id);

              return null;
            }

            const imageBuffer = await downloadImage(attachment.url);

            if (imageBuffer.length > 20 * 1024 * 1024) {
              log(
                `Downloaded image ${attachment.name} is too large (${Math.round(imageBuffer.length / 1024 / 1024)}MB). Skipping.`,
                "warn",
                "fileUploader.js",
              );

              await message.reactions.cache
                .find(
                  (reaction) =>
                    reaction.emoji.id === state.emojis["uploading"].id,
                )
                ?.users.remove(client.user.id);

              return null;
            }

            // Get the correct MIME type
            const mimeType = getImageMimeType(attachment.name);

            // Convert to base64
            const base64Image = imageBuffer.toString("base64");
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            // Create the file object for OpenAI vision
            const fileObject = {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "auto", // Can be "low", "high", or "auto"
              },
            };

            await message.reactions.cache
              .find(
                (reaction) =>
                  reaction.emoji.id === state.emojis["uploading"].id,
              )
              ?.users.remove(client.user.id);
            await message.react(state.emojis["uploaded"]);

            log(
              `Successfully processed image: ${attachment.name} (${Math.round(imageBuffer.length / 1024)}KB)`,
              "info",
              "fileUploader.js",
            );

            return fileObject;
          } catch (error) {
            log(
              `Error processing file ${attachment.name}: ${error.message}`,
              "error",
              "fileUploader.js",
            );

            // Remove uploading emoji if it exists
            await message.reactions.cache
              .find(
                (reaction) =>
                  reaction.emoji.id === state.emojis["uploading"].id,
              )
              ?.users.remove(client.user.id);

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

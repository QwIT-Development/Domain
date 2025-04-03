/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const axios = require('axios');
const {GoogleAIFileManager} = require("@google/generative-ai/server");
const config = require("../config.json");
const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
const log = require('../utils/betterLogs');
const fs = require('fs');
const path = require('path');
const state = require('../initializers/state');

async function uploadFilesToGemini(message, client) {
    let files;
    if (message.attachments.size > 0) {
        const files1 = await Promise.all(
            Array.from(message.attachments.values()).map(async (attachment) => {
                if (!attachment.url) {
                    log(`Invalid attachment URL: ${attachment}`, 'error', 'fileUploader.js');
                    return null;
                }
                const fPath = path.join(global.dirname, 'data', 'running', 'tmp', attachment.name);
                try {
                    await message.react(state.emojis['uploading']);
                    const response = await axios.get(attachment.url, {
                        responseType: 'arraybuffer',
                        validateStatus: () => true
                    });
                    fs.writeFileSync(fPath, response.data);
                    const uploadedFile = await uploadToGemini(fPath, attachment.contentType);
                    fs.unlinkSync(fPath);
                    await message.reactions.cache.find(reaction => reaction.emoji.id === state.emojis['uploading'].id)?.users.remove(client.user.id);
                    await message.react(state.emojis['uploaded']);
                    return uploadedFile;
                } catch (error) {
                    log(`Error uploading file: ${error}`, 'error', 'fileUploader.js');
                    return null;
                }
            })
        );
        files = files1.filter(file => file !== null);
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
    log(`Uploaded file: ${file.name}`, 'info', 'fileUploader.js');
    return file;
}

module.exports = uploadFilesToGemini;
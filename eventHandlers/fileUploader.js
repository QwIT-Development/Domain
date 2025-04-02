const axios = require('axios');
const {GoogleAIFileManager} = require("@google/generative-ai/server");
const config = require("../config.json");
const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
const log = require('../utils/betterLogs');
const fs = require('fs');
const path = require('path');

async function uploadFilesToGemini(message) {
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
                    await message.react('⬆');
                    const response = await axios.get(attachment.url, {
                        responseType: 'arraybuffer',
                        validateStatus: () => true
                    });
                    fs.writeFileSync(fPath, response.data);
                    const uploadedFile = await uploadToGemini(fPath, attachment.contentType);
                    fs.unlinkSync(fPath);
                    await message.reactions.removeAll();
                    await message.react('☁');
                    return uploadedFile;
                } catch (error) {
                    console.error('Upload failed:', error);
                    return null;
                }
            })
        );
        files = files1.filter(file => file !== null);
    }
}

async function uploadToGemini(path, mimeType) {
    const uploadResult = await fileManager.uploadFile(path, {
        mimeType,
        displayName: path,
    });
    const file = uploadResult.file;
    log(`Uploaded file: ${file.name}`, 'info', 'fileUploader.js');
    return file;
}
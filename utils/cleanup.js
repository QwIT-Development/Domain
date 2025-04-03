/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const {GoogleAIFileManager} = require("@google/generative-ai/server");
const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
const log = require('./betterLogs')
const {changeSpinnerText} = require('../utils/processInfo');

async function deleteArtifacts() {
    await changeSpinnerText('Deleting Artifacts...');
    const artifactDir = path.join(global.dirname, 'data', 'running', 'tmp');
    const files = fs.readdirSync(artifactDir);

    for (const file of files) {
        const filePath = path.join(artifactDir, file);
        if (fs.statSync(filePath).isFile() && file.startsWith('artifact_')) {
            fs.unlinkSync(filePath);
            log(`Deleted artifact: ${file}`, 'info', 'cleanup.js');
        }
    }
}

async function deleteUploadedItems() {
    await changeSpinnerText('Deleting Uploaded Items...');
    const fileIds = await getFileIds();
    if (!fileIds) {
        log("No fileIds found", 'ignorableErr', 'cleanup.js');
        return
    }
    try {
        for (const fileId of fileIds){
            await fileManager.deleteFile(fileId);
            log(`Deleted file with ID: ${fileId}`, 'info', 'cleanup.js');
        }
    } catch (error) {
        log(`Error deleting file with ID: ${error}`, 'error', 'cleanup.js');
    }
}

async function getFileIds(){
    try {
        const fileListResponse = await fileManager.listFiles({ pageSize: 100});

        if (fileListResponse.files && fileListResponse.files.length > 0) {
            return fileListResponse.files.map(file => file.name);
        } else {
            return [];
        }
    } catch (error) {
        log(`Error listing files: ${error}`, 'error', 'cleanup.js');
        return [];
    }
}

module.exports = {deleteArtifacts, deleteUploadedItems};
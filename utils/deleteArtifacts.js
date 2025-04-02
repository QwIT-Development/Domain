/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const fs = require('fs');
const path = require('path');

async function deleteArtifacts() {
    const artifactDir = path.join(global.dirname, 'data', 'running', 'tmp');
    const files = fs.readdirSync(artifactDir);

    for (const file of files) {
        const filePath = path.join(artifactDir, file);
        if (fs.statSync(filePath).isFile() && file.startsWith('artifact_')) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = deleteArtifacts;
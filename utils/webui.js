/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const express = require('express');
const app = express();
const state = require('../initializers/state');
const {promptLoader, model} = require('../initializers/geminiClient');
const log = require('./betterLogs');
const config = require('../config.json');

app.use(express.static('./utils/webui'));

app.get('/api/usagestats/:id', async (req, res) => {
    const id = req.params.id;

    if (id === 'ram') {
        res.json({
            total: process.memoryUsage().heapTotal,
            used: process.memoryUsage().heapUsed
        });
    }

    if (id === 'botstats') {
        res.json({
            count: state.msgCount,
            historyClears: state.resetCounts
        })
    }
})

app.put('/api/lobotomize', async (req, res) => {
    const geminiModel = await model();
    state.history = [];
    global.geminiSession = promptLoader(geminiModel, state.history);
    state.resetCounts += 1;

    res.json({
        success: true
    });
});

app.listen(config.WEBUI_PORT, () => {
    log(`WebUI listening at http://localhost:${config.WEBUI_PORT}`, 'info', 'webui.js');
    log("WebUI is not secured, do not expose the port.", 'infoWarn', 'webui.js');
});
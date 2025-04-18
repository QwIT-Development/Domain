/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const state = require('../initializers/state');
const {resetPrompt} = require('../initializers/geminiClient');
const log = require('./betterLogs');
const config = require('../config.json');

app.use(express.static('./utils/webui'));

app.put('/api/lobotomize', async (req, res) => {
    for (const channel in state.history) {
        state.history[channel] = [];
        global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
        state.resetCounts += 1;
    }

    broadcastStats();
    res.json({
        success: true
    });
});

const clients = new Set();

function getCurrentStats() {
    return {
        ram: {
            total: process.memoryUsage().heapTotal,
            used: process.memoryUsage().heapUsed
        },
        botStats: {
            msgCount: state.msgCount,
            historyClears: state.resetCounts
        },
        logs: state.logs.toReversed(),
    }
}

function broadcastStats() {
    const stats = getCurrentStats();
    const data = JSON.stringify({type: 'statsUpdate', payload: stats});

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, (err) => {
                if (err) {
                    log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
                    client.close();
                }
            })
        }
    })
}

wss.on('connection', (ws, req) => {
    log(`Socket connection`, 'info', 'webui.js (WebSocket)');
    clients.add(ws);

    const initialStats = getCurrentStats();
    ws.send(JSON.stringify({type: 'statsUpdate', payload: initialStats}), (err) => {
        if (err) {
            log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
            ws.close();
        }
    });

    ws.send(JSON.stringify({type: 'version', payload: {version: state.version, updateAvailable: false}}), (err) => {
        if (err) {
            log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
            ws.close();
        }
    })

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            log(`Received message from client (This shouldn't happen): ${JSON.stringify(parsedMessage)}`, 'warn', 'webui.js (WebSocket)');
        } catch (e) {
            log(`Received message from client (This shouldn't happen): ${message}`, 'warn', 'webui.js (WebSocket)');
        }
    });

    ws.on('close', () => {
        log(`Socket disconnected`, 'info', 'webui.js (WebSocket)');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        log(`Socket error: ${error.message}`, 'error', 'webui.js (WebSocket)');
        clients.delete(ws);
    });
})

const statsInterval = setInterval(broadcastStats, 2000);

const v8 = require('node:v8');
const path = require('path');
app.get('/api/heap/dump.heapsnapshot', (req, res) => {
    // Heap-${yyyymmdd}-${hhmmss}-${pid}-${thread_id}.heapsnapshot
    const heapFileName = `Heap-${new Date().toISOString().replace(/:/g, '-')}-${process.pid}-${process.threadId}.heapsnapshot`;
    const heapPath = path.join(global.dirname, 'data', 'running', 'tmp', heapFileName);
    const snapshotPath = v8.writeHeapSnapshot(heapPath);
    res.sendFile(path.join(global.dirname, snapshotPath));
})

app.get('/api/gc', (req, res) => {
    const before = getCurrentStats();
    const beforeUsed = before.ram.used;
    const beforeTotal = before.ram.total;
    if (Bun.gc) {
        Bun.gc(true);
    } else if (global.gc) {
        global.gc();
    } else {
        res.status(500).json({error: 'Garbage collection is unsupported'});
    }
    const after = getCurrentStats();
    const diffUsed = after.ram.used - beforeUsed;
    const diffTotal = after.ram.total - beforeTotal;

    res.json({
        usedDiff: (diffUsed / 1024 / 1024).toFixed(2),
        totalDiff: (diffTotal / 1024 / 1024).toFixed(2),
    })
})

server.listen(config.WEBUI_PORT, () => {
    log(`WebUI listening at http://localhost:${config.WEBUI_PORT}`, 'info', 'webui.js');
    log("WebUI is not secured, do not expose the port.", 'infoWarn', 'webui.js');
});

process.on('SIGINT', () => {
    log('Shutting down WebUI', 'info', 'webui.js');
    clearInterval(statsInterval);
    wss.close();
});
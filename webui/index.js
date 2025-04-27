/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server, autoPong: true});
const log = require('../utils/betterLogs');
const config = require('../config.json');
const path = require('path');
const bodyParser = require('body-parser');

// ejs, cus i don't want to reuse every single thing for a html
app.set('view engine', 'ejs');
app.set('views', path.join(global.dirname, 'webui', 'views'));

app.use(bodyParser.json())

app.use('/css', express.static(path.join(global.dirname, 'webui', 'css')));
app.use('/js', express.static(path.join(global.dirname, 'webui', 'js')));

app.get('/', (req, res) => {
    res.render('index');
})
app.get('/reputation', (req, res) => {
    res.render('reputation');
})
app.get('/bans', (req, res) => {
    res.render('bans');
})

const unban = require('./api/unban');
app.delete('/api/unban/:id', unban);
const ban = require('./api/ban');
app.put('/api/ban', ban);
const lobotomize = require('./api/lobotomize');
app.put('/api/lobotomize', lobotomize);
const repSave = require('./api/repSave');
app.put('/api/reputation/save', repSave);
const gc = require('./api/gc.js');
app.get('/api/gc', gc);
const heapdump = require('./api/heapdump');
app.get('/api/heap/dump.heapsnapshot', heapdump);


let wsInitialized = false;
let statsInterval = null;

const initializeWebSocket = () => {
    if (wsInitialized) return;

    log('Initializing WebSocket server...', 'info', 'webui.js');
    const wsConn = require('./func/wsConn');
    wss.on('connection', wsConn);

    const broadcastStats = require('./func/broadcastStats');
    statsInterval = setInterval(broadcastStats, 2000);

    process.on('SIGINT', () => {
        log('Shutting down WebUI', 'info', 'webui.js');
        clearInterval(statsInterval);
        wss.close();
    });

    wsInitialized = true;
    log('WebSocket server initialized', 'info', 'webui.js');
};

server.listen(config.WEBUI_PORT, () => {
    log(`WebUI listening at http://localhost:${config.WEBUI_PORT}`, 'info', 'webui.js');
    log("WebUI is not secured, do not expose the port.", 'infoWarn', 'webui.js');
});

process.on('SIGINT', () => {
    log('Shutting down WebUI', 'info', 'webui.js');
    clearInterval(statsInterval);
    wss.close();
});

initializeWebSocket();
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) {
            ws.close();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

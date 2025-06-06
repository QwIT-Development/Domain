/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const log = require('../utils/betterLogs');
const config = require('../config.json');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const unbanHandler = require('./api/unban');
const banHandler = require('./api/ban');
const lobotomizeHandler = require('./api/lobotomize');
const repSaveHandler = require('./api/repSave');
const gcHandler = require('./api/gc.js');
const heapdumpHandler = require('./api/heapdump');

const wsConn = require('./func/wsConn');
const broadcastStats = require('./func/broadcastStats');
const state = require('../initializers/state');

const viewsPath = path.join(global.dirname, 'webui', 'views');
const staticCSSPath = path.join(global.dirname, 'webui', 'css');
const staticJSPath = path.join(global.dirname, 'webui', 'js');

let statsInterval = null;

const server = Bun.serve({
    port: config.WEBUI_PORT,
    async fetch(req, server) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        if (server.upgrade(req)) {
            return;
        }

        try {
            if (pathname.startsWith('/css/')) {
                const filePath = path.join(staticCSSPath, pathname.substring('/css/'.length));
                const file = Bun.file(filePath);
                if (await file.exists()) {
                    return new Response(file);
                }
            } else if (pathname.startsWith('/js/')) {
                const filePath = path.join(staticJSPath, pathname.substring('/js/'.length));
                const file = Bun.file(filePath);
                if (await file.exists()) {
                    return new Response(file);
                }
            }

            // ejs
            else if (pathname === '/') {
                const filePath = path.join(viewsPath, 'index.ejs');
                const html = await ejs.renderFile(filePath);
                return new Response(html, { headers: { 'Content-Type': 'text/html' } });
            } else if (pathname === '/reputation') {
                const filePath = path.join(viewsPath, 'reputation.ejs');
                const html = await ejs.renderFile(filePath);
                return new Response(html, { headers: { 'Content-Type': 'text/html' } });
            } else if (pathname === '/bans') {
                const filePath = path.join(viewsPath, 'bans.ejs');
                const html = await ejs.renderFile(filePath);
                return new Response(html, { headers: { 'Content-Type': 'text/html' } });
            }

            // API Routes
            else if (pathname.startsWith('/api/')) {
                if (req.method === 'DELETE' && pathname.startsWith('/api/unban/')) {
                    return await unbanHandler(req);
                } else if (req.method === 'PUT' && pathname === '/api/ban') {
                    return await banHandler(req);
                } else if (req.method === 'PUT' && pathname === '/api/lobotomize') {
                    return await lobotomizeHandler(req);
                } else if (req.method === 'PUT' && pathname === '/api/reputation/save') {
                    return await repSaveHandler(req);
                } else if (req.method === 'GET' && pathname === '/api/gc') {
                    return await gcHandler(req);
                } else if (req.method === 'GET' && pathname === '/api/heap/dump.heapsnapshot') {
                    return await heapdumpHandler(req);
                }
            }

            return new Response("Not Found", { status: 404 });
        } catch (error) {
            log(`Error processing request: ${error}`, 'error', 'webui.js');
            return new Response("Internal Server Error", { status: 500 });
        }
    },
    websocket: {
        open(ws) {
            wsConn(ws);
        },
        message(ws, message) {
            ws.isAlive = true;
            try {
                const parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                } else {
                    log(`Received message from client (This shouldn't happen): ${JSON.stringify(parsedMessage)}`, 'warn', 'webui.js (WebSocket)');
                }
            } catch (e) {
                 log(`Received message from client (This shouldn't happen): ${message}`, 'warn', 'webui.js (WebSocket)');
            }
        },
        pong(ws, data) {
            ws.isAlive = true;
        },
        close(ws, code, reason) {
            state.wsClients.delete(ws);
        },
        error(ws, error) {
            state.wsClients.delete(ws);
            log(`WebSocket error: ${error}`, 'error', 'webui.js (WebSocket)');
        },
        perMessageDeflate: true,
    },
});

log(`WebUI listening at http://localhost:${config.WEBUI_PORT}`, 'info', 'webui.js');
log("WebUI is not secured, do not expose the port.", 'infoWarn', 'webui.js');

if (!statsInterval) {
    log('Initializing WebSocket broadcast...', 'info', 'webui.js');
    statsInterval = setInterval(() => broadcastStats(server), 2000);
    log('WebSocket broadcast initialized', 'info', 'webui.js');
}

process.on('SIGINT', () => {
    log('Shutting down WebUI', 'info', 'webui.js');
    if (statsInterval) {
        clearInterval(statsInterval);
    }
    server.stop(true);
    process.exit(0);
});
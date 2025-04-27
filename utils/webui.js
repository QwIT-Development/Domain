/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server, clientTracking: true});
const state = require('../initializers/state');
const {resetPrompt} = require('../initializers/geminiClient');
const log = require('./betterLogs');
const config = require('../config.json');
const path = require('path');
const bodyParser = require('body-parser');
const dataDir = path.join(global.dirname, 'data', 'running');
const fs = require('fs');

// ejs, cus i don't want to reuse every single thing for a html
app.set('view engine', 'ejs');
app.set('views', path.join(global.dirname, 'utils', 'webui', 'views'));

app.use(bodyParser.json())

app.use('/css', express.static(path.join(global.dirname, 'utils', 'webui', 'css')));
app.use('/js', express.static(path.join(global.dirname, 'utils', 'webui', 'js')));

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/reputation', (req, res) => {
    res.render('reputation');
})

app.get('/bans', (req, res) => {
    res.render('bans');
})

app.delete('/api/unban/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({error: 'Invalid request'});
    }

    if (state.banlist[id]) {
        delete state.banlist[id];
        if (usersCache[id]) {
            delete usersCache[id];
        }
        const banlistPath = path.join(dataDir, 'banlist.json');
        fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
        res.json({success: true});
    } else {
        res.status(404).json({error: 'User not found'});
    }
})

app.put('/api/ban', async (req, res) => {
    const id = req.body.id;
    const reason = req.body.reason;
    if (!id || !reason) {
        return res.status(400).json({error: 'Invalid request'});
    }
    if (state.banlist[id]) {
        return res.status(400).json({error: 'User already banned'});
    }
    state.banlist[id] = reason;
    if (usersCache[id]) {
        delete usersCache[id];
    }
    const banlistPath = path.join(dataDir, 'banlist.json');
    fs.writeFileSync(banlistPath, JSON.stringify(state.banlist, null, 2));
})

app.put('/api/lobotomize', async (req, res) => {
    for (const channel in state.history) {
        state.history[channel] = [];
        global.geminiSession = resetPrompt(global.geminiModel, state.history, channel);
        state.resetCounts += 1;
    }

    await broadcastStats();
    res.json({
        success: true
    });
});

const clients = new Set();

const discordClient = global.discordClient;
const usersCache = {};

async function getUserInfo(userId) {
    // client should be already initialized when webui is fired up
    try {
        const user = await discordClient.users.fetch(userId);
        if (!user) {
            return null;
        }
        const username = user.username;
        const avatarUrl = user.displayAvatarURL({dynamic: true, size: 256});

        return {username, avatarUrl};
    } catch (e) {
        log(`Error fetching user data: ${e}`, 'error', 'webui.js (getUserStats)');
        return null;
    }
}

async function getEntry(userId) {
    const now = Date.now();
    let entry = usersCache[userId];
    let needsRefresh = false;

    if (!entry || (now - entry.lastUpdated > config.TIMINGS.userCacheDuration)) {
        needsRefresh = true;
    }

    let userInfo = null;
    if (needsRefresh) {
        userInfo = await getUserInfo(userId);
        if (userInfo) {
            entry = {
                id: userId,
                username: userInfo.username,
                avatarUrl: userInfo.avatarUrl,
                lastUpdated: now,
                // this shouldn't fail, but if it does fail we just return 0
                score: state.reputation[userId] || 0,
                banReason: state.banlist[userId] || null,
            };
            usersCache[userId] = entry;
        } else {
            if (entry) {
                entry.lastUpdated = now;
            } else {
                entry = {
                    id: userId,
                    username: 'Unknown',
                    avatarUrl: null,
                    lastUpdated: now,
                    score: state.reputation[userId] || 0,
                    banReason: state.banlist[userId] || null,
                };
                usersCache[userId] = entry;
            }
        }
    }
    return entry;
}

async function getCurrentStats() {
    const userIds = Object.keys(state.reputation || {});
    const entryPromises = userIds.map(async userId => getEntry(userId));
    const userEntries = (await Promise.all(entryPromises)).filter(entry => entry !== null);

    const mem = process.memoryUsage();
    return {
        ram: {
            total: mem.heapTotal,
            used: mem.heapUsed
        },
        botStats: {
            msgCount: state.msgCount,
            historyClears: state.resetCounts
        },
        users: userEntries.map(entry => ({
            id: entry.id,
            username: entry.username,
            avatarUrl: entry.avatarUrl,
            score: entry.score,
            banReason: entry.banReason,
        })),
        logs: state.logs.toReversed() || [],
    }
}

async function broadcastStats() {
    try {
        const stats = await getCurrentStats();
        const data = JSON.stringify({type: 'statsUpdate', payload: stats});

        const deadClients = new Set();

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.isAlive) {
                client.send(data, (err) => {
                    if (err) {
                        log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
                        deadClients.add(client);
                        client.terminate();
                    }
                });
            } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                deadClients.add(client);
            }
        });

        deadClients.forEach(client => {
            clients.delete(client);
        })
    } catch (e) {
        log(`Error broadcasting stats: ${e}`, 'error', 'webui.js (WebSocket)');
    }
}

wss.on('connection', async (ws) => {
    ws.isAlive = false;

    clients.add(ws);

    try {
        const initialStats = await getCurrentStats();
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({type: 'statsUpdate', payload: initialStats}), (err) => {
                if (err) {
                    log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
                    ws.close();
                }
            });
        }
    } catch (e) {
        log(`Error sending initial stats to client: ${e}`, 'error', 'webui.js (WebSocket)');
        ws.close();
    }


    ws.send(JSON.stringify({type: 'version', payload: {version: state.version, updateAvailable: false}}), (err) => {
        if (err) {
            log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
            ws.close();
        }
    })

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            if (parsedMessage.type === 'ping') {
                ws.isAlive = true;
                ws.send(JSON.stringify({type: 'pong'}))
                return;
            }
            log(`Received message from client (This shouldn't happen): ${JSON.stringify(parsedMessage)}`, 'warn', 'webui.js (WebSocket)');
        } catch (e) {
            log(`Received message from client (This shouldn't happen): ${message}`, 'warn', 'webui.js (WebSocket)');
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        log(`Socket error: ${error.message}`, 'error', 'webui.js (WebSocket)');
        clients.delete(ws);
    });
})

const statsInterval = setInterval(broadcastStats, 2000);

const v8 = require('node:v8');
app.get('/api/heap/dump.heapsnapshot', (req, res) => {
    // Heap-${yyyymmdd}-${hhmmss}-${pid}-${thread_id}.heapsnapshot
    const heapFileName = `Heap-${new Date().toISOString().replace(/:/g, '-')}-${process.pid}-${process.threadId}.heapsnapshot`;
    const heapPath = path.join(global.dirname, 'data', 'running', 'tmp', heapFileName);
    const snapshotPath = v8.writeHeapSnapshot(heapPath);
    res.sendFile(path.join(global.dirname, snapshotPath));
})

app.get('/api/gc', async (req, res) => {
    const before = await getCurrentStats();
    const beforeUsed = before.ram.used;
    const beforeTotal = before.ram.total;
    if (Bun.gc) {
        Bun.gc(true);
    } else if (global.gc) {
        global.gc();
    } else {
        res.status(500).json({error: 'Garbage collection is unsupported'});
    }
    const after = await getCurrentStats();
    const diffUsed = after.ram.used - beforeUsed;
    const diffTotal = after.ram.total - beforeTotal;

    res.json({
        usedDiff: (diffUsed / 1024 / 1024).toFixed(2),
        totalDiff: (diffTotal / 1024 / 1024).toFixed(2),
    })
})

app.put('/api/reputation/save', async (req, res) => {
    const id = req.body.id;
    const score = req.body.score;

    if (!id || isNaN(score)) {
        return res.status(400).json({error: 'Invalid request'});
    }
    if (score > 1000) {
        return res.status(400).json({error: 'Score too high'});
    }
    if (score < -1000) {
        return res.status(400).json({error: 'Score too low'});
    }

    state.reputation[id] = score;

    // remove cached user
    if (usersCache[id]) {
        delete usersCache[id];
    }

    res.json({success: true});
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
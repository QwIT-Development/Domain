const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");
const getCurrentStats = require("./getCurrentStats");

async function broadcastStats() {
    try {
        const currentStats = await getCurrentStats();
        const deadClients = new Set();

        state.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {

                if (client.isAlive === false) {
                    log('Client failed to respond to ping, terminating connection.', 'warn', 'webui.js (WebSocket)');
                    client.terminate();
                    deadClients.add(client);
                    return;
                }
                client.isAlive = false;
                try {
                    client.ping();
                } catch (e) {
                    log(`Error sending ping to client: ${e.message}`, 'error', 'webui.js (WebSocket)');
                    deadClients.add(client);
                    return;
                }
            }
        });

        deadClients.forEach(client => state.wsClients.delete(client));

        const sendPromises = Array.from(state.wsClients).map(client => {
            return new Promise(resolve => {
                if (client.readyState === WebSocket.OPEN && !deadClients.has(client)) {
                    let payloadToSend;
                    let isDelta = false;

                    if (!client.lastSentStats) {
                        payloadToSend = currentStats;
                        client.lastSentStats = JSON.parse(JSON.stringify(currentStats));
                    } else {
                        const diff = {};
                        let hasChanges = false;
                        for (const key in currentStats) {
                            if (JSON.stringify(currentStats[key]) !== JSON.stringify(client.lastSentStats[key])) {
                                diff[key] = currentStats[key];
                                hasChanges = true;
                            }
                        }

                        if (hasChanges) {
                            payloadToSend = diff;
                            isDelta = true;
                            client.lastSentStats = JSON.parse(JSON.stringify(currentStats));
                        } else {
                            resolve();
                            return;
                        }
                    }

                    const data = JSON.stringify({ type: 'statsUpdate', payload: payloadToSend, isDelta });

                    try {
                        client.send(data);
                    } catch (err) {
                        log(`Error sending stats to client: ${err.message}`, 'error', 'webui.js (WebSocket)');
                        deadClients.add(client);
                    }
                }
                resolve();
            });
        });

        await Promise.all(sendPromises);

        deadClients.forEach(client => {
            try {
                state.wsClients.delete(client);
                if (client.readyState !== WebSocket.CLOSED) {
                    client.close();
                }
            } catch (err) {
                log(`Error cleaning up client: ${err.message}`, 'error', 'webui.js (WebSocket)');
            }
        });

    } catch (e) {
        log(`Error broadcasting stats: ${e.message}`, 'error', 'webui.js (WebSocket)');
    }
}

module.exports = broadcastStats;
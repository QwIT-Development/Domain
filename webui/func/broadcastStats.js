const WebSocket = require("ws");
const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");

const getCurrentStats = require("./getCurrentStats");
async function broadcastStats() {
    try {
        const currentStats = await getCurrentStats();
        const deadClients = new Set();

        state.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.isAlive = false;
            }
        });

        const sendPromises = Array.from(state.wsClients).map(client => {
            return new Promise(resolve => {
                if (client.readyState === WebSocket.OPEN) {
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

                    client.send(data, (err) => {
                        if (err) {
                            log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
                            deadClients.add(client);
                        }
                        resolve();
                    });
                } else {
                    deadClients.add(client);
                    resolve();
                }
            });
        });

        await Promise.all(sendPromises);

        state.wsClients.forEach(client => {
            if (!client.isAlive && client.readyState === WebSocket.OPEN) {
                log('Client failed to respond to ping, terminating connection.', 'warn', 'webui.js (WebSocket)');
                client.terminate();
                deadClients.add(client);
            }
        });

        deadClients.forEach(client => {
            try {
                state.wsClients.delete(client);
                if (client.readyState !== WebSocket.CLOSED) {
                    client.close();
                }
            } catch (err) {
                log(`Error cleaning up client: ${err}`, 'error', 'webui.js (WebSocket)');
            }
        });
    } catch (e) {
        log(`Error broadcasting stats: ${e}`, 'error', 'webui.js (WebSocket)');
    }
}

module.exports = broadcastStats;
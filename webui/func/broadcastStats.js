const WebSocket = require("ws");
const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");

const getCurrentStats = require("./getCurrentStats");
async function broadcastStats() {
    try {
        const stats = await getCurrentStats();
        const data = JSON.stringify({type: 'statsUpdate', payload: stats});

        const deadClients = new Set();

        const sendPromises = Array.from(state.wsClients).map(client => {
            return new Promise(resolve => {
                if (client.readyState === WebSocket.OPEN && client.isAlive) {
                    client.send(data, (err) => {
                        if (err) {
                            log(`Error sending stats to client: ${err}`, 'error', 'webui.js (WebSocket)');
                            deadClients.add(client);
                            client.close();
                        }
                        resolve();
                    });
                } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                    deadClients.add(client);
                    resolve();
                } else {
                    resolve();
                }
            });
        });

        await Promise.all(sendPromises);

        // clean up dead clients
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
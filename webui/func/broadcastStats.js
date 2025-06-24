const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");
const getCurrentStats = require("./getCurrentStats");

async function sendStatsToClient(client, currentStats, deadClients) {
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
                console.error(`Error sending stats to client: ${err.message}`);
                deadClients.add(client);
            }
        }
        resolve();
    });
}

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
                    console.error(`Error sending ping to client: ${e.message}`);
                    deadClients.add(client);
                }
            }
        });

        deadClients.forEach(client => state.wsClients.delete(client));

        const sendPromises = Array.from(state.wsClients).map(client => {
            return sendStatsToClient(client, currentStats, deadClients);
        });

        await Promise.all(sendPromises);

        deadClients.forEach(client => {
            try {
                state.wsClients.delete(client);
                if (client.readyState !== WebSocket.CLOSED) {
                    client.close();
                }
            } catch (err) {
                console.error(`Error cleaning up client: ${err.message}`);
            }
        });

    } catch (e) {
        console.error(`Error broadcasting stats: ${e.message}`);
    }
}

module.exports = broadcastStats;
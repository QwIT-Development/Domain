const getCurrentStats = require("./getCurrentStats");
const WebSocket = require("ws");
const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");
const wsConn = async (ws) => {
    ws.isAlive = true;

    state.wsClients.add(ws);

    try {
        await new Promise((resolve, reject) => {
            ws.send(JSON.stringify({type: 'meow'}), (err) => {
                if (err) reject(err);
                else resolve();
            });
        })

        const initialStats = await getCurrentStats();
        await new Promise((resolve, reject) => {
            ws.send(JSON.stringify({type: 'statsUpdate', payload: initialStats}), (err) => {
                if (err) reject(err);
                else resolve();
            })
        })
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
        state.wsClients.delete(ws);
    });

    ws.on('error', (error) => {
        log(`Socket error: ${error.message}`, 'error', 'webui.js (WebSocket)');
        state.wsClients.delete(ws);
    });
}

module.exports = wsConn;
const getCurrentStats = require("./getCurrentStats");
const log = require("../../utils/betterLogs");
const state = require("../../initializers/state");

const wsConn = async (ws) => {
    ws.isAlive = true;

    state.wsClients.add(ws);

    try {
        const initialStats = await getCurrentStats();
        ws.lastSentStats = JSON.parse(JSON.stringify(initialStats));

        ws.send(JSON.stringify({type: 'statsUpdate', payload: initialStats, isDelta: false}));

    } catch (e) {
        log(`Error sending initial stats to client: ${e.message}`, 'error', 'webui.js (WebSocket)');
        ws.close();
        return;
    }

    try {
        ws.send(JSON.stringify({type: 'version', payload: {version: state.version, updateAvailable: false}}));
    } catch (e) {
        log(`Error sending version info to client: ${e.message}`, 'error', 'webui.js (WebSocket)');
    }
};

module.exports = wsConn;
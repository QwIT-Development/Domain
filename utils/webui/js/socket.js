const socket = new WebSocket(`ws://${window.location.host}`);

const rootPath = (window.location.pathname === '/');

socket.onopen = () => {
    console.info('socket connected');
};

socket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        if (message.type === 'statsUpdate' && message.payload) {
            const stats = message.payload;

            if (rootPath) {
                if (stats.ram) {
                    const ramUsed = (stats.ram.used / 1024 / 1024).toFixed(2);
                    const ramTotal = (stats.ram.total / 1024 / 1024).toFixed(2);
                    document.getElementById('heapused').textContent = `${ramUsed} MB`;
                    document.getElementById('heaptotal').textContent = `${ramTotal} MB`;
                }

                if (stats.botStats) {
                    document.getElementById('msgReceived').textContent = stats.botStats.msgCount;
                    document.getElementById('resetCount').textContent = stats.botStats.historyClears;
                }

                const logsElement = document.getElementById('logs');
                if (stats.logs && Array.isArray(stats.logs)) {
                    logsElement.innerHTML = '';
                    stats.logs.forEach(logEntry => {
                        const logLine = document.createElement('div');
                        logLine.classList.add('log-entry');
                        if (logEntry.cssClass) {
                            logLine.classList.add(logEntry.cssClass);
                        }
                        logLine.textContent = `${logEntry.timestamp} ${logEntry.symbol}[${logEntry.thread}]: ${logEntry.message}`;
                        logsElement.appendChild(logLine);
                    });
                }
            }
        } else if (message.type === 'version' && message.payload) {
            const stats = message.payload;
            if (stats.version) {
                document.getElementById('version').textContent = `${stats.version}`;
            }
        }
    } catch (e) {
        console.error('socket parsing error:', e);
        console.error('we got:', event.data);
    }
};

socket.onclose = (event) => {
    console.info('socket closed:', event);
};

socket.onerror = (error) => {
    console.error('socket error:', error);
};
const socket = new WebSocket(`ws://${window.location.host}`);

const rootPath = (window.location.pathname === '/');
const reputationPath = (window.location.pathname === '/reputation');
const bansPath = (window.location.pathname === '/bans');

function createCard(user, cardType) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-12 col-md-12 col-lg';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.userId = user.id;

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    const avatarImg = document.createElement('img');
    avatarImg.src = user.avatarUrl || 'data:,';
    avatarImg.alt = ''; // blank alt
    avatarImg.width = 32;
    avatarImg.height = 32;
    avatarImg.className = 'me-2 rounded-circle';

    const usernameP = document.createElement('p');
    usernameP.style.marginBottom = '0';
    usernameP.textContent = user.username;

    cardHeader.appendChild(avatarImg);
    cardHeader.appendChild(usernameP);

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    if (cardType === 'reputation') {
        // Reputation-specific content
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'mb-3';

        const scoreLabel = document.createElement('label');
        const inputId = `scoreInput_${user.id}`;
        scoreLabel.htmlFor = inputId;
        scoreLabel.textContent = 'Score:';

        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.className = 'form-control';
        scoreInput.id = inputId;
        scoreInput.name = 'scoreInput';
        scoreInput.value = user.score;
        scoreInput.max = 1000;
        scoreInput.min = -1000;

        scoreDiv.appendChild(scoreLabel);
        scoreDiv.appendChild(scoreInput);

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn btn-outline-primary';
        saveButton.textContent = 'Save Score';
        saveButton.style.width = '100%';
        saveButton.onclick = () => {
            const newScore = parseInt(scoreInput.value, 10);
            if (isNaN(newScore)) {
                alert('Invalid score');
                return;
            }
            const data = {
                id: user.id,
                score: newScore
            };
            fetch('/api/reputation/save', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Score saved successfully');
                    } else {
                        alert('Failed to save score');
                    }
                })
                .catch(error => {
                    console.error('Error saving score:', error);
                    alert('Failed to save score');
                });
        };

        cardBody.appendChild(scoreDiv);
        cardBody.appendChild(saveButton);
    } else if (cardType === 'ban') {
        const reasonDiv = document.createElement('div');
        reasonDiv.className = 'mb-3';

        const reason = document.createElement('p');
        reason.innerText = "Reason: " + user.banReason;

        reasonDiv.appendChild(reason);

        const liftButton = document.createElement('button');
        liftButton.type = 'button';
        liftButton.className = 'btn btn-outline-primary';
        liftButton.textContent = 'Lift Ban';
        liftButton.style.width = '100%';
        liftButton.onclick = () => {
            fetch(`/api/unban/${user.id}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Ban lifted.');
                    } else {
                        alert('Failed to lift ban.');
                    }
                })
                .catch(error => {
                    console.error('Failed to lift ban: ', error);
                    alert('Failed to lift ban.');
                });
        };

        cardBody.appendChild(reasonDiv);
        cardBody.appendChild(liftButton);
    }

    cardDiv.appendChild(cardHeader);
    cardDiv.appendChild(cardBody);
    colDiv.appendChild(cardDiv);

    return colDiv;
}

let pingIntervalId = null;
let pingTimeout = null;
let currentStats = {};

socket.onopen = () => {
    console.info('socket connected');

    const sendPing = () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({type: 'ping'}));
            if (pingTimeout) clearTimeout(pingTimeout);
            pingTimeout = setTimeout(() => {
                console.warn('No pong received from server. Connection might be stale.');
            }, 5000);
        }
    };

    sendPing();

    if (pingIntervalId) clearInterval(pingIntervalId);
    pingIntervalId = setInterval(sendPing, 25000);
};

socket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        if (message.type === 'pong') {
            if (pingTimeout) {
                clearTimeout(pingTimeout);
                pingTimeout = null;
            }
        } else if (message.type === 'statsUpdate' && message.payload) {
            if (message.isDelta) {
                Object.assign(currentStats, message.payload);
            } else {
                currentStats = message.payload;
            }

            const stats = currentStats;

            if (rootPath) {
                if (stats.ram) {
                    const ramUsed = (stats.ram.used / 1024 / 1024).toFixed(2);
                    const ramTotal = (stats.ram.total / 1024 / 1024).toFixed(2);
                    document.getElementById('heapused').textContent = `${ramUsed} MB`;
                    document.getElementById('heaptotal').textContent = `${ramTotal} MB`;
                }

                if (stats.botStats) {
                    document.getElementById('msgReceived').textContent = stats.botStats.msgCount.toString();
                    document.getElementById('resetCount').textContent = stats.botStats.historyClears.toString();
                }

                if (stats.muteCount != null) {
                    document.getElementById('muteCount').textContent = stats.muteCount.toString();
                }

                if (stats.users) {
                    const users = stats.users || [];
                    document.getElementById('userNumber').textContent = users.length.toString();
                    const bans = users.filter(user => user.banReason && typeof user.banReason === 'string');
                    document.getElementById('banCount').textContent = bans.length.toString();
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
            if (reputationPath) {
                const userCont = document.getElementById('user-cards-container');
                const users = stats.users || [];
                const userIds = new Set(users.map(u => u.id));
                const existingUserCards = userCont.querySelectorAll('.card[data-user-id]');

                existingUserCards.forEach(cardElement => {
                    const userId = cardElement.dataset.userId;
                    if (!userIds.has(userId)) {
                        const colDiv = cardElement.closest('.col-12');
                        if (colDiv) {
                            userCont.removeChild(colDiv);
                        }
                    }
                });

                users.forEach(user => {
                    let card = userCont.querySelector(`.card[data-user-id="${user.id}"]`);

                    if (card) {
                        const scoreInput = card.querySelector('input[name="scoreInput"]');
                        const avatarImg = card.querySelector('img');
                        const usernameP = card.querySelector('.card-header p');

                        if (scoreInput && document.activeElement !== scoreInput && String(scoreInput.value) !== String(user.score)) {
                            scoreInput.value = user.score;
                        }

                        const newAvatarUrl = user.avatarUrl || 'data:,';
                        if (avatarImg && avatarImg.src !== newAvatarUrl) {
                            avatarImg.src = newAvatarUrl;
                        }

                        if (usernameP && usernameP.textContent !== user.username) {
                            usernameP.textContent = user.username;
                        }

                    } else {
                        const userCardElement = createCard(user, 'reputation');
                        userCont.appendChild(userCardElement);
                    }
                });
            }
            if (bansPath) {
                const banCont = document.getElementById('ban-cards-container');
                const users = stats.users || [];

                const filter = users.filter(user => user.banReason && typeof user.banReason === 'string');

                banCont.innerHTML = '';
                filter.forEach(ban => {
                    const banCardElement = createCard(ban, 'ban');
                    banCont.appendChild(banCardElement);
                })
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
    if (pingTimeout) {
        clearTimeout(pingTimeout);
        pingTimeout = null;
    }
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
    }
};

socket.onerror = (error) => {
    console.error('socket error:', error);
    if (pingTimeout) {
        clearTimeout(pingTimeout);
        pingTimeout = null;
    }
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
    }
};
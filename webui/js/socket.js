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
    let avatarSrc;
    const rawUserAvatarUrl = user.avatarUrl;

    if (typeof rawUserAvatarUrl === 'string' && rawUserAvatarUrl.trim() !== '') {
        const lowerUrl = rawUserAvatarUrl.toLowerCase();
        if (lowerUrl.startsWith('https:')) {
            avatarSrc = rawUserAvatarUrl;
        } else if (lowerUrl.startsWith('data:')) {
            avatarSrc = rawUserAvatarUrl;
        } else if (lowerUrl.startsWith('http:')) {
            if (window.location.protocol === 'https:') {
                avatarSrc = 'data:,';
            } else {
                avatarSrc = rawUserAvatarUrl;
            }
        } else {
            avatarSrc = 'data:,';
        }
    } else {
        avatarSrc = 'data:,';
    }
    avatarImg.src = avatarSrc;
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

        const bondLvlP = document.createElement('p');
        bondLvlP.textContent = `Bond Level: ${user.bondLvl}`;

        const totalMsgP = document.createElement('p');
        totalMsgP.textContent = `Total Messages: ${user.totalMsgCount}`;

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
        cardBody.appendChild(bondLvlP);
        cardBody.appendChild(totalMsgP);
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
            fetch(`/api/unban/${encodeURIComponent(user.id)}`, {
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
            socket.send(JSON.stringify({ type: 'ping' }));
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

function handlePong() {
    if (pingTimeout) {
        clearTimeout(pingTimeout);
        pingTimeout = null;
    }
}

function updateDomElement(id, textContent) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = textContent;
    }
}

function updateRootPathStats(stats) {
    if (!rootPath) return;

    if (stats.ram) {
        const ramUsed = (stats.ram.used / 1024 / 1024).toFixed(2);
        const ramTotal = (stats.ram.total / 1024 / 1024).toFixed(2);
        updateDomElement('heapused', `${ramUsed} MB`);
        updateDomElement('heaptotal', `${ramTotal} MB`);
    }

    if (stats.botStats) {
        updateDomElement('msgReceived', stats.botStats.msgCount.toString());
        updateDomElement('resetCount', stats.botStats.historyClears.toString());
        updateDomElement('isSleeping', stats.botStats.isSleeping.toString());
        updateDomElement('websocketClients', stats.botStats.websocketClients.toString());
        updateDomElement('retryCount', stats.botStats.retryCount.toString());
        updateDomElement('messageQueueCount', stats.botStats.messageQueueCount.toString());
        updateDomElement('processingTaskCount', stats.botStats.processingTaskCount.toString());
        updateDomElement('historyCount', stats.botStats.historyCount.toString());
        updateDomElement('version', stats.botStats.version);
    }

    if (stats.muteCount != null) {
        updateDomElement('muteCount', stats.muteCount.toString());
    }

    if (stats.users) {
        const users = stats.users || [];
        updateDomElement('userNumber', users.length.toString());
        const bans = users.filter(user => user.banReason && typeof user.banReason === 'string');
        updateDomElement('banCount', bans.length.toString());
    }

    const logsElement = document.getElementById('logs');
    if (stats.logs && Array.isArray(stats.logs) && logsElement) {
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

function updateReputationPathStats(stats) {
    if (!reputationPath) return;

    const userCont = document.getElementById('user-cards-container');
    if (!userCont) return;

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

            let newAvatarUrl;
            const rawUserAvatarUrl = user.avatarUrl;

            if (typeof rawUserAvatarUrl === 'string' && rawUserAvatarUrl.trim() !== '') {
                const lowerUrl = rawUserAvatarUrl.toLowerCase();
                if (lowerUrl.startsWith('https:')) {
                    newAvatarUrl = rawUserAvatarUrl;
                } else if (lowerUrl.startsWith('data:')) {
                    newAvatarUrl = rawUserAvatarUrl;
                } else if (lowerUrl.startsWith('http:')) {
                    if (window.location.protocol === 'https:') {
                        newAvatarUrl = 'data:,';
                    } else {
                        newAvatarUrl = rawUserAvatarUrl;
                    }
                } else {
                    newAvatarUrl = 'data:,';
                }
            } else {
                newAvatarUrl = 'data:,';
            }

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

function updateBansPathStats(stats) {
    if (!bansPath) return;

    const banCont = document.getElementById('ban-cards-container');
    if (!banCont) return;

    const users = stats.users || [];
    const filteredBans = users.filter(user => user.banReason && typeof user.banReason === 'string');

    banCont.innerHTML = '';
    filteredBans.forEach(ban => {
        const banCardElement = createCard(ban, 'ban');
        banCont.appendChild(banCardElement);
    });
}

function handleStatsUpdate(payload, isDelta) {
    if (isDelta) {
        Object.assign(currentStats, payload);
    } else {
        currentStats = payload;
    }
    const stats = currentStats;

    updateRootPathStats(stats);
    updateReputationPathStats(stats);
    updateBansPathStats(stats);
}

socket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        if (message.type === 'pong') {
            handlePong();
        } else if (message.type === 'statsUpdate' && message.payload) {
            handleStatsUpdate(message.payload, message.isDelta);
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
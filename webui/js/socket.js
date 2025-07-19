const socket = new WebSocket(`ws://${window.location.host}`);

function createCard(user, cardType) {
  const cardDiv = document.createElement("div");
  cardDiv.className =
    "bg-domain-card rounded-lg shadow-xl border border-domain-border";
  cardDiv.dataset.userId = user.id;

  const cardHeader = document.createElement("div");
  cardHeader.className =
    "px-4 py-3 border-b border-domain-border flex items-center gap-2";

  // Avatar handling
  const avatarContainer = document.createElement("div");
  let avatarSrc;
  const rawUserAvatarUrl = user.avatarUrl;

  if (typeof rawUserAvatarUrl === "string" && rawUserAvatarUrl.trim() !== "") {
    const lowerUrl = rawUserAvatarUrl.toLowerCase();
    if (lowerUrl.startsWith("https:")) {
      avatarSrc = rawUserAvatarUrl;
    } else if (lowerUrl.startsWith("data:")) {
      avatarSrc = rawUserAvatarUrl;
    } else if (lowerUrl.startsWith("http:")) {
      if (window.location.protocol === "https:") {
        avatarSrc = "data:,";
      } else {
        avatarSrc = rawUserAvatarUrl;
      }
    } else {
      avatarSrc = "data:,";
    }
  } else {
    avatarSrc = "data:,";
  }

  if (avatarSrc && avatarSrc !== "data:,") {
    const avatarImg = document.createElement("img");
    avatarImg.src = avatarSrc;
    avatarImg.alt = "";
    avatarImg.className = "w-10 h-10 rounded-full flex-shrink-0";
    avatarContainer.appendChild(avatarImg);
  } else {
    // Default avatar placeholder
    const avatarPlaceholder = document.createElement("div");
    avatarPlaceholder.className =
      "w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white flex-shrink-0";
    const personIcon = document.createElement("span");
    personIcon.className = "material-symbols-rounded text-base";
    personIcon.textContent = "person";
    avatarPlaceholder.appendChild(personIcon);
    avatarContainer.appendChild(avatarPlaceholder);
  }

  const usernameDiv = document.createElement("div");
  usernameDiv.className = "flex-1";
  const usernameH3 = document.createElement("h3");
  usernameH3.className = "text-lg font-semibold text-gray-100";
  usernameH3.textContent = user.username;
  usernameDiv.appendChild(usernameH3);

  cardHeader.appendChild(avatarContainer);
  cardHeader.appendChild(usernameDiv);

  const cardBody = document.createElement("div");
  cardBody.className = "p-4";

  if (cardType === "reputation") {
    // Reputation-specific content
    const scoreDiv = document.createElement("div");
    scoreDiv.className = "space-y-3";

    const scoreLabel = document.createElement("label");
    const inputId = `scoreInput_${user.id}`;
    scoreLabel.htmlFor = inputId;
    scoreLabel.className = "block text-sm font-medium text-gray-300 mb-1";
    scoreLabel.textContent = "Score:";

    const scoreInput = document.createElement("input");
    scoreInput.type = "number";
    scoreInput.className =
      "w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-domain-red focus:border-transparent";
    scoreInput.id = inputId;
    scoreInput.name = "scoreInput";
    scoreInput.value = user.score;
    scoreInput.max = 1000;
    scoreInput.min = -1000;

    const infoDiv = document.createElement("div");
    infoDiv.className = "space-y-1";

    const bondLvlP = document.createElement("p");
    bondLvlP.className = "text-sm text-gray-300 flex items-center gap-2";
    bondLvlP.innerHTML = `<span class="material-symbols-rounded text-blue-400 text-sm">link</span>Bond Level: <span class="text-blue-400 font-mono">${user.bondLvl}</span>`;

    const totalMsgP = document.createElement("p");
    totalMsgP.className = "text-sm text-gray-300 flex items-center gap-2";
    totalMsgP.innerHTML = `<span class="material-symbols-rounded text-cyan-400 text-sm">chat_bubble</span>Total Messages: <span class="text-blue-400 font-mono">${user.totalMsgCount.toLocaleString()}</span>`;

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className =
      "w-full px-4 py-2 bg-domain-red hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2";
    saveButton.innerHTML = `<span class="material-symbols-rounded text-sm">save</span>Save Score`;
    saveButton.onclick = () => {
      const newScore = parseInt(scoreInput.value, 10);
      if (isNaN(newScore)) {
        alert("Invalid score");
        return;
      }
      const data = {
        id: user.id,
        score: newScore,
      };
      fetch("/api/reputation/save", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Score saved successfully");
          } else {
            alert("Failed to save score");
          }
        })
        .catch((error) => {
          console.error("Error saving score:", error);
          alert("Failed to save score");
        });
    };

    scoreDiv.appendChild(scoreLabel);
    scoreDiv.appendChild(scoreInput);
    infoDiv.appendChild(bondLvlP);
    infoDiv.appendChild(totalMsgP);
    scoreDiv.appendChild(infoDiv);
    scoreDiv.appendChild(saveButton);
    cardBody.appendChild(scoreDiv);
  } else if (cardType === "ban") {
    const reasonDiv = document.createElement("div");
    reasonDiv.className = "space-y-3";

    const reasonP = document.createElement("p");
    reasonP.className = "text-sm text-gray-300 p-2 bg-gray-800/30 rounded-lg";
    reasonP.innerHTML = `<span class="material-symbols-rounded text-red-400 text-sm mr-2">info</span><strong>Reason:</strong> ${user.banReason}`;

    const liftButton = document.createElement("button");
    liftButton.type = "button";
    liftButton.className =
      "w-full px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2";
    liftButton.innerHTML = `<span class="material-symbols-rounded text-sm">check_circle</span>Lift Ban`;
    liftButton.onclick = () => {
      fetch(`/api/unban/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Ban lifted.");
          } else {
            alert("Failed to lift ban.");
          }
        })
        .catch((error) => {
          console.error("Failed to lift ban: ", error);
          alert("Failed to lift ban.");
        });
    };

    reasonDiv.appendChild(reasonP);
    reasonDiv.appendChild(liftButton);
    cardBody.appendChild(reasonDiv);
  }

  cardDiv.appendChild(cardHeader);
  cardDiv.appendChild(cardBody);

  return cardDiv;
}

let pingIntervalId = null;
let pingTimeout = null;
let currentStats = {};

socket.onopen = () => {
  console.info("socket connected");

  const sendPing = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "ping" }));
      if (pingTimeout) clearTimeout(pingTimeout);
      pingTimeout = setTimeout(() => {
        console.warn(
          "No pong received from server. Connection might be stale.",
        );
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
  if (stats.ram) {
    const ramUsed = (stats.ram.used / 1024 / 1024).toFixed(2);
    const ramTotal = (stats.ram.total / 1024 / 1024).toFixed(2);
    updateDomElement("heapused", `${ramUsed} MB`);
    updateDomElement("heaptotal", `${ramTotal} MB`);
  }

  if (stats.botStats) {
    updateDomElement("msgReceived", stats.botStats.msgCount.toString());
    updateDomElement("resetCount", stats.botStats.historyClears.toString());
    updateDomElement("isSleeping", stats.botStats.isSleeping.toString());
    updateDomElement(
      "websocketClients",
      stats.botStats.websocketClients.toString(),
    );
    updateDomElement("retryCount", stats.botStats.retryCount.toString());
    updateDomElement(
      "messageQueueCount",
      stats.botStats.messageQueueCount.toString(),
    );
    updateDomElement(
      "processingTaskCount",
      stats.botStats.processingTaskCount.toString(),
    );
    updateDomElement("historyCount", stats.botStats.historyCount.toString());
    updateDomElement("version", stats.botStats.version);
  }

  if (stats.muteCount != null) {
    updateDomElement("muteCount", stats.muteCount.toString());
  }

  if (stats.users) {
    const users = stats.users || [];
    updateDomElement("userNumber", users.length.toString());
    const bans = users.filter(
      (user) => user.banReason && typeof user.banReason === "string",
    );
    updateDomElement("banCount", bans.length.toString());
  }

  const logsElement = document.getElementById("logs");
  if (stats.logs && Array.isArray(stats.logs) && logsElement) {
    logsElement.innerHTML = "";
    stats.logs.forEach((logEntry) => {
      const logLine = document.createElement("div");
      logLine.classList.add("log-entry");
      if (logEntry.cssClass) {
        logLine.classList.add(logEntry.cssClass);
      }
      logLine.textContent = `${logEntry.timestamp} ${logEntry.symbol}[${logEntry.thread}]: ${logEntry.message}`;
      logsElement.appendChild(logLine);
    });
    // Auto-scroll to bottom
    logsElement.scrollTop = logsElement.scrollHeight;
  }
}

function updateReputationPathStats(stats) {
  const userCont = document.getElementById("user-cards-container");
  if (!userCont) return;

  const users = stats.users || [];
  const userIds = new Set(users.map((u) => u.id));
  const existingUserCards = userCont.querySelectorAll("[data-user-id]");

  existingUserCards.forEach((cardElement) => {
    const userId = cardElement.dataset.userId;
    if (!userIds.has(userId)) {
      userCont.removeChild(cardElement);
    }
  });

  users.forEach((user) => {
    let card = userCont.querySelector(`[data-user-id="${user.id}"]`);
    if (card) {
      const scoreInput = card.querySelector('input[name="scoreInput"]');
      const avatarImg = card.querySelector("img");
      const usernameH3 = card.querySelector("h3");

      if (
        scoreInput &&
        document.activeElement !== scoreInput &&
        String(scoreInput.value) !== String(user.score)
      ) {
        scoreInput.value = user.score;
      }

      let newAvatarUrl;
      const rawUserAvatarUrl = user.avatarUrl;

      if (
        typeof rawUserAvatarUrl === "string" &&
        rawUserAvatarUrl.trim() !== ""
      ) {
        const lowerUrl = rawUserAvatarUrl.toLowerCase();
        if (lowerUrl.startsWith("https:")) {
          newAvatarUrl = rawUserAvatarUrl;
        } else if (lowerUrl.startsWith("data:")) {
          newAvatarUrl = rawUserAvatarUrl;
        } else if (lowerUrl.startsWith("http:")) {
          if (window.location.protocol === "https:") {
            newAvatarUrl = "data:,";
          } else {
            newAvatarUrl = rawUserAvatarUrl;
          }
        } else {
          newAvatarUrl = "data:,";
        }
      } else {
        newAvatarUrl = "data:,";
      }

      if (avatarImg && avatarImg.src !== newAvatarUrl) {
        avatarImg.src = newAvatarUrl;
      }

      if (usernameH3 && usernameH3.textContent !== user.username) {
        usernameH3.textContent = user.username;
      }
    } else {
      const userCardElement = createCard(user, "reputation");
      userCont.appendChild(userCardElement);
    }
  });
}

function updateBansPathStats(stats) {
  const banCont = document.getElementById("ban-cards-container");
  if (!banCont) return;

  const users = stats.users || [];
  const filteredBans = users.filter(
    (user) => user.banReason && typeof user.banReason === "string",
  );

  banCont.innerHTML = "";
  filteredBans.forEach((ban) => {
    const banCardElement = createCard(ban, "ban");
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

    if (message.type === "pong") {
      handlePong();
    } else if (message.type === "statsUpdate" && message.payload) {
      handleStatsUpdate(message.payload, message.isDelta);
    }
  } catch (e) {
    console.error("socket parsing error:", e);
    console.error("we got:", event.data);
  }
};

socket.onclose = (event) => {
  console.info("socket closed:", event);
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
  console.error("socket error:", error);
  if (pingTimeout) {
    clearTimeout(pingTimeout);
    pingTimeout = null;
  }
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
};

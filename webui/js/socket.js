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

  // Card body content can be added here if needed for other card types

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

function handleStatsUpdate(payload, isDelta) {
  if (isDelta) {
    Object.assign(currentStats, payload);
  } else {
    currentStats = payload;
  }
  const stats = currentStats;

  updateRootPathStats(stats);
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

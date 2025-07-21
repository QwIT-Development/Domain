/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const log = require("../utils/betterLogs");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

const unbanHandler = require("./api/unban");
const banHandler = require("./api/ban");
const lobotomizeHandler = require("./api/lobotomize");
const repSaveHandler = require("./api/repSave");
const gcHandler = require("./api/gc.js");
const heapdumpHandler = require("./api/heapdump");
const toggleLeaderboardVisibilityHandler = require("./api/toggleLeaderboardVisibility");

const wsConn = require("./func/wsConn");
const broadcastStats = require("./func/broadcastStats");
const getLeaderboardData = require("./func/getLeaderboardData");
const getAllUsersForManagement = require("./func/getAllUsersForManagement");
const getBannedUsersData = require("./func/getBannedUsersData");
const warmupCache = require("./func/warmupCache");
const cacheRefreshService = require("../cronJobs/cacheRefreshService");
const state = require("../initializers/state");

const viewsPath = path.join(global.dirname, "webui", "views");
const staticCSSPath = path.join(global.dirname, "webui", "css");
const staticJSPath = path.join(global.dirname, "webui", "js");

let statsInterval = null;

async function getPromptsData() {
  try {
    const promptsDir = path.join(global.dirname, "prompts");

    if (!fs.existsSync(promptsDir)) {
      return [];
    }

    const files = fs.readdirSync(promptsDir);
    const promptFiles = files.filter(
      (file) => file.endsWith(".md") || file.endsWith(".txt"),
    );

    promptFiles.sort((a, b) => a.localeCompare(b));
    return promptFiles;
  } catch (error) {
    console.error(`Error fetching prompts: ${error}`);
    return [];
  }
}

async function handleStaticFile(pathname, staticPath, prefix) {
  const filePath = path.join(staticPath, pathname.substring(prefix.length));
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }
  return null;
}

async function handleEjsTemplate(viewName, data = {}) {
  const filePath = path.join(viewsPath, viewName);
  const html = await ejs.renderFile(filePath, data);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

async function handleApiRoutes(req, pathname) {
  if (req.method === "DELETE" && pathname.startsWith("/api/unban/")) {
    return await unbanHandler(req);
  } else if (req.method === "PUT" && pathname === "/api/ban") {
    return await banHandler(req);
  } else if (req.method === "PUT" && pathname === "/api/lobotomize") {
    return await lobotomizeHandler(req);
  } else if (req.method === "PUT" && pathname === "/api/reputation/save") {
    return await repSaveHandler(req);
  } else if (req.method === "GET" && pathname === "/api/gc") {
    return await gcHandler(req);
  } else if (
    req.method === "GET" &&
    pathname === "/api/heap/dump.heapsnapshot"
  ) {
    return await heapdumpHandler(req);
  } else if (
    req.method === "PUT" &&
    pathname === "/api/leaderboard/visibility"
  ) {
    return await toggleLeaderboardVisibilityHandler(req);
  } else if (req.method === "GET" && pathname === "/api/prompts") {
    return new Response(JSON.stringify(await getPromptsData()), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

const server = Bun.serve({
  port: config.WEBUI_PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (server.upgrade(req)) {
      return;
    }

    try {
      let response = null;
      if (pathname.startsWith("/css/")) {
        response = await handleStaticFile(pathname, staticCSSPath, "/css/");
      } else if (pathname.startsWith("/js/")) {
        response = await handleStaticFile(pathname, staticJSPath, "/js/");
      } else if (pathname === "/") {
        response = await handleEjsTemplate("index.ejs");
      } else if (pathname === "/leaderboard") {
        const leaderboardData = await getLeaderboardData();
        response = await handleEjsTemplate("leaderboard.ejs", leaderboardData);
      } else if (pathname === "/leaderboard/manage") {
        const managementData = await getAllUsersForManagement();
        response = await handleEjsTemplate(
          "leaderboard-manage.ejs",
          managementData,
        );
      } else if (pathname === "/banned-users") {
        const bannedUsersData = await getBannedUsersData();
        response = await handleEjsTemplate("banned-users.ejs", bannedUsersData);
      } else if (pathname.startsWith("/api/")) {
        response = await handleApiRoutes(req, pathname);
      }

      if (response) {
        return response;
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error(`Error processing request: ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  websocket: {
    open(ws) {
      wsConn(ws).then();
    },
    message(ws, message) {
      ws.isAlive = true;
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      } else {
        log(
          `Received message from client (This shouldn't happen): ${JSON.stringify(parsedMessage)}`,
          "warn",
          "webui.js (WebSocket)",
        );
      }
    },
    pong(ws) {
      ws.isAlive = true;
    },
    close(ws) {
      state.wsClients.delete(ws);
    },
    error(ws, error) {
      state.wsClients.delete(ws);
      console.error(`WebSocket error: ${error}`);
    },
    perMessageDeflate: true,
  },
});

log(
  `WebUI listening at http://localhost:${config.WEBUI_PORT}`,
  "info",
  "webui.js",
);
log("WebUI is not secured, do not expose the port.", "warn", "webui.js");

// Wait for Discord client to be ready before warming up cache
async function startCacheWarmup() {
  // Wait for Discord client to be available and ready
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout

  while (attempts < maxAttempts) {
    if (global.discordClient && global.discordClient.isReady()) {
      try {
        await warmupCache();
      } catch (error) {
        console.error(`User cache warmup failed: ${error.message}`);
      }
      return;
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
  }

  console.warn(
    "Discord client not ready after 30 seconds, proceeding without cache warmup",
  );
}

// Start cache warmup asynchronously
startCacheWarmup().catch((error) => {
  console.error(`Cache warmup startup failed: ${error.message}`);
});

log("Initializing WebSocket broadcast...", "info", "webui.js");
statsInterval = setInterval(() => broadcastStats(), 2000);
log("WebSocket broadcast initialized", "info", "webui.js");

cacheRefreshService.start();

process.on("SIGINT", () => {
  log("Shutting down WebUI", "info", "webui.js");
  if (statsInterval) {
    clearInterval(statsInterval);
  }
  cacheRefreshService.stop();
  process.exit(0);
});

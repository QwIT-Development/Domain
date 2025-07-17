# Domain-Unchained AI Coding Instructions

## Architecture Overview

**Domain-Unchained** is a sophisticated Discord bot powered by Google's Gemini API with a complex, state-driven architecture featuring:

### Core Architecture Components
- **Per-Channel Gemini Models**: Each Discord channel gets its own Gemini model instance with custom system prompts from `prompts/*.md` files
- **Global State Management**: Centralized state in `initializers/state.js` tracks conversation history, user cache, processing queues, runtime configuration, banned sites, WebSocket clients, and more
- **Message Processing Pipeline**: Queue-based message processing with per-channel queues to prevent race conditions
- **LZ-String Compression**: 70%+ reduction in storage size for conversation history using `lz-string` compression
- **Real-time WebUI Dashboard**: Bun-powered HTTP server with WebSocket broadcasting for live stats and management
- **Function Tools Ecosystem**: Gemini can execute tools (reputation, mute, SVG→PNG, web search, memory storage, sandbox terminal)
- **Multi-Layer Security**: Jailbreak detection, banned site filtering, fuzzy search protection, auto-ban progression
- **Internationalization**: Crowdin-managed translations for 20+ languages with locale-specific date formatting
- **Scheduled Operations**: Cron-like sleep cycles, prompt refreshing, reputation decay, daily summaries

## Critical Message Flow Pipeline

The message processing pipeline is the heart of Domain-Unchained, handling everything from Discord events to Gemini API calls to tool execution:

```javascript
// Main entry point: index.js
discordClient.on(Events.MessageCreate, async message => {
    if (!allowInteraction || state.isSleeping) return;
    await messageHandler(message, discordClient, global.geminiModel);
});

// Per-channel queue system prevents race conditions
state.messageQueues[channelId].push({ message, client, gemini });
if (state.isProcessing[channelId]) return; // Skip if already processing
state.isProcessing[channelId] = true;
```

### Complete 10-Step Message Processing Flow:

1. **Queue Management** (`messageHandler.js`): Messages enter per-channel queues to prevent concurrent processing conflicts
2. **Author Validation** (`checkAuthors.js`): Filter bots, banned users, jailbreak attempts, comment filtering (`//` prefix ignored)
3. **File Upload Processing** (`fileUploader.js`): Discord attachments → Gemini File API with progress emoji reactions (uploading/uploaded)
4. **Context-Aware Response Decision** (`shouldRespond.js`): Gemini-powered decision engine determines if bot should respond based on conversation context and personality
5. **Message Formatting** (`formatUserMessage`): Structure message with user metadata (reputation, bond level, timestamps, reply context)
6. **History Management** (`historyUtils.js`): Trim to `MAX_MESSAGES`, ensure user/model alternation for Gemini API compatibility
7. **Gemini API Streaming** (`callGeminiAPI`): Stream responses with function call detection, handle thinking mode, parse text vs tool calls
8. **Tool Execution** (`botCommands.js`): Execute function calls (reputation ±, mute with auto-ban, SVG→PNG, search, memory, terminal)
9. **Response Processing** (`processResponse`): Filter @everyone/@here mentions, remove system context leakage
10. **Response Chunking** (`chunkedMsg`): Split >2000 char responses, extract code blocks as file artifacts, handle Discord limits

### Error Handling & Resilience:
```javascript
// Gemini API retry logic with exponential backoff
if (status === 429) { retryDelay = 60000; } // Rate limiting - 1 minute
else if (status === 500 || 503) { retryDelay = 3000; } // Server errors - 3 seconds
// Max 5 retries per channel, then drop task with user notification
```

## State Management Patterns

### Global State (`initializers/state.js`)
The entire bot state is centralized in a single module with these critical properties:
```javascript
module.exports = {
    // Core Statistics
    msgCount: 0,                    // Total messages processed
    resetCounts: 0,                 // History clear count (lobotomizations)
    muteCount: 0,                   // Total mutes issued
    version: packageJson.version,   // Bot version from package.json
    
    // Conversation Management
    history: {},                    // Per-channel conversation history (in-memory working copy)
    prompts: {},                    // Cached system prompts per channel
    tempChannels: {},               // Ephemeral channels (use DEFAULT_PROMPT, not persisted)
    
    // Processing Control
    messageQueues: {},              // Per-channel message processing queues
    isProcessing: {},               // Concurrency control flags per channel
    retryCounts: {},                // API retry tracking per channel
    
    // User & Caching
    usersCache: {},                 // User data cache with TTL (TIMINGS.userCacheDuration)
    memories: {},                   // Runtime memory cache
    
    // Security & Filtering
    bannedSitesExact: new Set(),    // Exact domain matches for filtering
    bannedSitesWildcard: [],        // Wildcard suffix matches (*.example.com)
    
    // WebUI & Monitoring
    wsClients: new Set(),           // WebSocket connections for real-time updates
    logs: [],                       // Structured logs for WebUI display
    
    // Discord Integration
    emojis: {},                     // Resolved Discord emojis from config
    commandIds: {},                 // Discord slash command IDs
    
    // Scheduling & Lifecycle
    isSleeping: false,              // Global sleep state
    sleepCycleTimer: null,          // Sleep timer reference
    summaries: {},                  // Daily conversation summaries
    
    // Localization & Config
    strings: {},                    // Loaded locale strings
    config: null,                   // Parsed TOML configuration
    
    // Debug & Location Tracking
    locationHelper: { init: "main" } // Startup phase tracking
};
```

### Configuration Layers
Domain uses a sophisticated multi-layer configuration system:

**Primary Config** (`config.toml` - TOML format):
```toml
# Core Credentials
DISCORD_TOKEN = ""
GEMINI_API_KEY = ""
GEMINI_MODEL = "gemini-2.5-flash"

# Bot Behavior
ALIASES = ["domain", "dave"]        # Bot mention aliases
MAX_MESSAGES = 200                  # History limit per channel
ENABLE_THINKING = true              # Gemini thinking capabilities
DEEPER_THINKING = true              # 20k vs 8k thinking budget
BAN_AFTER = 20                     # Auto-ban after N mutes
LOCALE = "en-US"                   # Localization + date formatting
DEFAULT_PROMPT = "default.md"      # Fallback prompt file

# Infrastructure
WEBUI_PORT = 4500                  # WebUI dashboard port
SEARX_BASE_URL = ""               # SearX instance for search
SLEEPINGRANGE = "22:30-6:00"      # Sleep schedule
ALLOW_SANDBOX = false             # Terminal execution toggle

# Channel Configuration
[CHANNELS]
"123456789" = { 
    prompt = "custom.md",          # Per-channel prompt file
    wikis = ["https://wiki.example.com"], # External context URLs
    contextRespond = true          # Use shouldRespond for context-aware responses
}

# Custom Discord Emojis
[EMOJIS]
upvote = "1234567890"
downvote = "1234567890"
mute = "1234567890"
search = "1234567890"
uploading = "1234567890"
uploaded = "1234567890"

# Advanced Settings
[TIMINGS]
resetPrompt = 600                  # Prompt refresh interval (seconds)
userCacheDuration = 3600000        # User cache TTL (milliseconds)

# Proxy Support
[[PROXIES]]
protocol = "http"
host = "proxy.local"
port = 8080
auth = { username = "user", password = "pass" }

# Remote Blocklists
REMOTE_LISTS = ["https://example.com/blocklist.txt"]
```

**Localization** (`data/locales/strings_${locale}.json` - Crowdin managed):
- 20+ languages supported with fallback to en-US
- Automatic caller filename detection in logging
- Locale-specific date formatting: `2025. jan 01. Wednesday 12:00`

**Runtime Variables**: Never persist `state` directly - use database for permanent storage

### Database Schema (Prisma + SQLite)
```prisma
model User {
  id String @id                    // Discord user ID
  repPoint Int @default(0)         // Reputation score
  banned Boolean @default(false)   // Ban status
  banMessage String?               // Ban reason
  msgCount Int @default(0)         // Messages for next bond level
  totalMsgCount Int @default(0)    // Analytics counter
  bondLvl Int @default(0)          // Bond level (affects rep gains)
  muteCount Int @default(0)        // Mute counter (auto-ban after BAN_AFTER)
  lastInteraction DateTime @default(now()) // For reputation decay
  decayed Boolean @default(false)  // Decay status flag
}
model Memory { channelId, content, createdAt } // Channel-specific memories
model History { channelId @unique, history (LZ-compressed JSON), createdAt, updatedAt }
```

## Gemini Integration Architecture

### Model Creation Per Channel (`initializers/geminiClient.js`)
```javascript
// Each channel gets unique model config with custom system prompt
models[channel] = {
    temperature: 1, topP: 0.95, topK: 64, maxOutputTokens: 8192,
    systemInstruction: await makePrompt(channel),
    thinkingConfig: { thinkingBudget: config.DEEPER_THINKING ? 20000 : 8000 },
    tools // Function declarations from initializers/tools.js
};
```

### Prompt Template System (`functions/makePrompt.js`)
```javascript
// Dynamic prompt templating with context injection
prompt = prompt.replace("{ALIASES}", aliases.join(', '));
prompt = prompt.replace("{CURRENT_TIME}", formatDate(new Date())); // 2025. jan 01. Wednesday 12:00
prompt = prompt.replace("{WIKI_CONTENT}", await getContext(urls)); // External wiki content
prompt = prompt.replace("{MEMORIES}", await getMemories(channelId)); // Channel-specific memories
prompt = prompt.replace("{MUTE_WORDS}", muteWords.join(', ')); // Auto-moderation triggers
```

### Function Tools (`initializers/tools.js` + `eventHandlers/botCommands.js`)
- **reputation**: Increase/decrease user reputation, adds upvote/downvote emoji reactions
- **mute**: Timeout users with auto-ban after `BAN_AFTER` mutes, DM notifications, fuzzy search protection
- **svg**: Generate PNG from SVG code, strict validation for proper `<svg>` tags with width/height
- **search**: SearX integration for web search results with emoji reactions
- **memory**: Store contextual information per channel in database for long-term context
- **terminal**: Sandbox command execution (if `ALLOW_SANDBOX=true`) via boxie utility

### Advanced Context Resolution (`shouldRespond.js`)
```javascript
// Gemini-powered decision making for contextual responses
const shouldRespond = async (message, client, history, prompt) => {
    // Uses separate Gemini call to determine if bot should respond
    // Returns "true" or "false" based on context and bot personality
    // Prevents unnecessary responses while maintaining natural conversation flow
};
```

## Error Handling & Resilience

### Gemini API Error Recovery (`handleGeminiError`)
```javascript
// Comprehensive retry logic for transient errors
if (status === 429) { retryDelay = 60000; } // Rate limiting - 1 minute cooldown
else if (status === 500 || 503) { retryDelay = 3000; } // Server errors - 3 second retry
state.retryCounts[channelId]++;
if (state.retryCounts[channelId] > 5) { 
    // Drop task after 5 retries, send error message to channel
    return message.channel.send("Couldn't get a response, try again later.");
}
```

### Graceful Shutdown (`index.js`)
```javascript
// Comprehensive cleanup on exit signals (SIGINT, SIGTERM, SIGHUP, beforeExit, exit)
for (const channelId in state.history) {
    await saveHistory(channelId, state.history[channelId]); // Save LZ-compressed history
}
await deleteArtifacts(); // Clean up SVG/code artifacts
await deleteUploadedItems(); // Clean up Gemini uploaded files
```

### Sentry Integration
```javascript
// Automatic error tracking with stack traces
Sentry.init({
    dsn: "...", release: `domain@${packageJson.version}`,
    attachStacktrace: true, ignoreErrors: []
});
// All uncaught exceptions and unhandled rejections captured automatically
```

## WebUI Architecture (`webui/index.js`)

### Bun HTTP Server + WebSocket
```javascript
// Native Bun server with EJS templating, static file serving, real-time WebSocket stats
server = Bun.serve({
    port: config.WEBUI_PORT, // Default 4500
    websocket: { 
        open, message, pong, close, error, // WebSocket lifecycle handlers
        perMessageDeflate: true // Compression enabled
    }
});
```

### API Endpoints (`webui/api/`)
- **`PUT /api/ban`**: Ban user with reason, check existing ban status
- **`DELETE /api/unban/:userId`**: Unban operations with cache invalidation
- **`PUT /api/lobotomize`**: Clear all channel histories (nuclear option)
- **`PUT /api/reputation/save`**: Bulk reputation updates with validation (-1000 to 1000)
- **`GET /api/gc`**: Manual garbage collection with before/after memory stats
- **`GET /api/heap/dump.heapsnapshot`**: V8 heap dump generation for memory debugging
- **`GET /api/prompts`**: List available prompt files for management

### Real-time Stats Broadcasting (`webui/func/broadcastStats.js`)
```javascript
// WebSocket stats every 2 seconds with ping/pong heartbeat
const stats = {
    ram: { used, total }, // Memory usage
    botStats: { msgCount, historyClears, isSleeping, websocketClients, retryCount, messageQueueCount, processingTaskCount },
    users: [{ id, username, avatarUrl, score, banReason, bondLvl, totalMsgCount }], // User data with avatars
    muteCount, logs: state.logs.toReversed() // Recent logs with CSS classes
};
```

## Development Workflow

### Local Development
```bash
bun install                           # Install dependencies (Bun package manager)
bunx prisma migrate dev --name init   # Database setup with migrations
cp template.config.toml config.toml   # Copy configuration template
# Edit config.toml with Discord token, Gemini API key, channel IDs, emojis
bun run start                         # Start bot (also supports --no-interaction flag)
```

### Docker Development
```bash
docker compose up -d                  # Start with docker-compose
docker compose logs -f Domain-Unchained  # View logs
# Mount config.toml as read-only volume, exclude /etc/timezone on non-Linux
```

### Database Management
```bash
bunx prisma studio                    # Database GUI on localhost:5555
bunx prisma migrate dev               # Create new migration
bunx prisma db push                   # Push schema changes without migration
```

### WebUI Access
- **Dashboard**: `http://localhost:4500` (not secured - don't expose publicly)
- **Features**: Real-time logs, memory monitoring, ban management, reputation editing, garbage collection

## Critical Dependencies & Technology Stack

- **Runtime**: Bun v1.2.14+ (JavaScript runtime, replaces Node.js entirely)
- **Discord**: `discord.js v14` with slash commands, emoji resolution, file uploads
- **AI**: `@google/genai v1.9.0` (direct Gemini API, NOT @google/generative-ai wrapper)
- **Database**: Prisma ORM v6.12.0 + SQLite with LZ-string compression
- **Compression**: `lz-string v1.5.0` for conversation history (70%+ size reduction)
- **Web**: Bun native HTTP server + EJS templating + WebSockets (no Express needed)
- **Monitoring**: `@sentry/bun v9.39.0` error tracking with automatic exception capture
- **Configuration**: `toml v3.0.0` parsing with template-based setup
- **Image Processing**: `sharp v0.34.3` for SVG to PNG conversion
- **Web Scraping**: `cheerio v1.1.0`, `html-to-text v9.0.5`, `robots-parser v3.0.1`
- **Utilities**: `fuse.js v7.1.0` for fuzzy search, `ora v8.2.0` for CLI spinners

## File Organization & Conventions

```
index.js                  # Main entry point, graceful shutdown, signal handlers, cron job loading
initializers/            # Core system initialization (state, clients, tools)
├── state.js            # Global state management with all runtime variables
├── geminiClient.js     # Per-channel Gemini model creation with tools
├── tools.js            # Function tool declarations for Gemini (reputation, mute, svg, search, memory, terminal)
├── configuration.js    # TOML config loading, localization, setup validation
├── botClient.js        # Discord client setup with slash command collection
├── emojiResolver.js    # Custom emoji resolution from config
├── historyCreator.js   # History initialization from database
└── leaveUnknownServers.js # Auto-leave non-configured servers

eventHandlers/          # Discord event processing
├── messageHandler.js   # Main message pipeline with queue management and chunking
├── botCommands.js      # Function tool execution (reputation, mute, SVG, search, memory, terminal)
├── fileUploader.js     # Discord file → Gemini file URI conversion with progress emojis
└── searchHandler.js    # SearX search integration

functions/              # Core business logic
├── makePrompt.js       # Dynamic prompt template system with variable substitution
├── shouldRespond.js    # Context-aware response decision using Gemini
├── checkAuthors.js     # Message filtering (bots, bans, jailbreaks, comments)
├── memories.js         # Channel-specific memory management
├── usageRep.js         # Bond level progression and reputation calculation
├── presenceManager.js  # Discord presence management (ready/sleeping/offline)
├── sleeping.js         # Scheduled sleep mode with cron-like time ranges
└── rng.js              # Random utilities

db/                     # Database operations
├── history.js          # LZ-compressed conversation persistence
└── reputation.js       # User reputation CRUD operations with caching

utils/                  # Utilities and helpers
├── historyUtils.js     # History trimming and management for Gemini compatibility
├── betterLogs.js       # Structured logging with Sentry integration and WebUI broadcasting
├── svg2png.js          # SVG to PNG conversion with Sharp
├── bannedSiteGen.js    # Banned site list generation from local + remote sources
├── fuzzySearch.js      # Fuzzy search utilities for content filtering
├── proxy.js            # Proxy support with user agent rotation
├── searx.js            # SearX integration with content extraction and context generation
├── cleanup.js          # Artifact and uploaded file cleanup
├── processInfo.js      # CLI spinner utilities for startup feedback
└── boxie.js            # Sandbox command execution

webui/                  # Real-time web dashboard
├── index.js            # Bun HTTP server + WebSocket with API routing
├── api/               # REST API endpoints (ban, unban, lobotomize, repSave, gc, heapdump)
├── func/              # WebUI utilities (wsConn, broadcastStats, getCurrentStats, getEntry)
├── views/             # EJS templates with Bootstrap styling
├── css/               # Static CSS files
└── js/                # Client-side JavaScript (WebSocket handling, API calls)

commands/              # Discord slash commands
├── amIBanned.js       # Ban status check
├── call.js            # Add bot to channel (owner-only)
├── debug.js           # System debugging information
├── reputation.js      # Reputation display
├── reset.js           # Channel history reset (owner-only)
├── setCommands.js     # Slash command registration
├── summarize.js       # Daily conversation summary
└── version.js         # Bot version information

cronJobs/              # Scheduled tasks
├── cronReset.js       # Prompt refresh every 10 minutes (TIMINGS.resetPrompt)
└── repDecay.js        # Daily reputation decay for inactive users (7+ days)

prompts/               # Markdown system prompts per channel
data/                  # Static and runtime data
├── locales/          # i18n strings (Crowdin managed, 20+ languages)
├── bannedSites.json  # Local banned domain list
├── jailbreaks.json   # Jailbreak attempt detection patterns
├── muteWords.json    # Auto-moderation trigger words
├── summarize.md      # Template for daily summaries
└── running/          # Runtime data (memories.json, reputation.json, banlist.json, tmp/, bannedSitesCache/)

prisma/               # Database schema and migrations
knowledge/            # Additional knowledge files loaded into prompts
```

## Configuration System

### Primary Config (`config.toml`)
```toml
DISCORD_TOKEN = ""              # Discord bot token from developer portal
GEMINI_API_KEY = ""            # Google AI Studio API key (free tier available)
GEMINI_MODEL = "gemini-2.5-flash"  # Model variant (2.5-flash, 2.0-flash, etc.)
ALIASES = ["domain", "dave"]    # Bot mention aliases for triggering responses
MAX_MESSAGES = 200             # History limit per channel before trimming
ENABLE_THINKING = true         # Enable Gemini thinking capabilities
DEEPER_THINKING = true         # 20k vs 8k thinking budget
BAN_AFTER = 20                # Auto-ban after N mutes
LOCALE = "en-US"              # Localization and date formatting
WEBUI_PORT = 4500             # WebUI dashboard port
SEARX_BASE_URL = ""           # SearX instance for search functionality
SLEEPINGRANGE = "22:30-6:00"  # Sleep schedule (bot inactive during these hours)
ALLOW_SANDBOX = false         # Enable terminal command execution
DEFAULT_PROMPT = "default.md" # Fallback prompt file

[CHANNELS]
"123456789" = { 
    prompt = "custom.md", 
    wikis = ["https://wiki.example.com"], 
    contextRespond = true  # Use shouldRespond for context-aware responses
}

[EMOJIS] # Custom emoji IDs for reactions
upvote = "1234567890"
downvote = "1234567890"
mute = "1234567890"
search = "1234567890"
uploading = "1234567890"
uploaded = "1234567890"

[TIMINGS] # Internal timing configurations
resetPrompt = 600             # Prompt refresh interval (seconds)
userCacheDuration = 3600000   # User cache TTL (milliseconds)
```

### Advanced Configuration Patterns
```javascript
// Temporary channels (not persisted, use DEFAULT_PROMPT)
state.tempChannels[channelId] = true; // Created via /call command

// Proxy configuration with authentication
PROXIES = [{ protocol: "http", host: "proxy.local", port: 8080, auth: { username, password } }]

// Remote blocklist integration
REMOTE_LISTS = ["https://example.com/blocklist.txt"] // Auto-cached with update detection
```

### Logging Pattern
```javascript
const log = require('./utils/betterLogs');
log('message content', 'info|warn|error', 'filename.js');
// Features:
// - Automatic caller filename detection
// - Sentry integration for errors  
// - WebUI broadcasting with CSS classes
// - Console output with colors and symbols
// - Structured log storage in state.logs
```

## Testing & Debugging

### WebUI Dashboard (`http://localhost:4500`)
- **Real-time Logs**: Color-coded log entries with automatic scrolling
- **System Monitoring**: Memory usage, message counts, processing queues
- **User Management**: Reputation editing, ban/unban controls with reason tracking
- **Performance Tools**: Manual garbage collection, heap dump generation
- **Channel Stats**: History counts, processing status, retry counters

### Owner Commands (Discord slash commands)
- **`/debug`**: System information (servers, history counts, memory usage)
- **`/reset`**: Clear conversation history for current channel
- **`/call`**: Add bot to channel temporarily (creates temp channel)
- **`/version`**: Bot version and build information
- **`/summarize`**: Retrieve daily conversation summary

### Advanced Debugging Features
```javascript
// Location tracking during initialization
state.locationHelper.init = "filename.js/function";

// Error context preservation
state.retryCounts[channelId] // API retry tracking per channel
state.isProcessing[channelId] // Concurrency control status

// Memory debugging
Bun.gc(true); // Force garbage collection
v8.writeHeapSnapshot(); // Generate heap dump
```

## Security & Moderation

### Multi-Layer Content Filtering
```javascript
// Jailbreak detection
jailbreaks.some(jailbreak => message.content.toLowerCase().includes(jailbreak.toLowerCase()))
// Auto-deletes message, mutes user for 30 minutes

// Banned site filtering with caching
state.bannedSitesExact.has(domain) || state.bannedSitesWildcard.some(suffix => domain.endsWith(suffix))
// Supports both exact matches and wildcard patterns (*.example.com)

// Remote blocklist integration
REMOTE_LISTS = ["https://example.com/blocklist.txt"] // Auto-updates with caching
```

### Advanced Moderation Features
```javascript
// Auto-ban progression
if (updatedUser.muteCount > config.BAN_AFTER) {
    await prisma.user.update({ data: { banned: true, banMessage: `Automated action after ${config.BAN_AFTER} mutes` } });
    await user.send(state.strings.muting.autoBan);
}

// Fuzzy search protection in mute command (prevents self-muting via typos)
if (fuzzySearch(userIdToMuteStr, [messageUID], 0.3)) { muteID = messageUID; }

// Comment filtering (messages starting with // are ignored)
if (message.content.startsWith('//')) return false;
```

### Access Control & Permissions
```javascript
// Owner-only commands
if (!config.OWNERS.includes(interaction.user.id)) { /* deny access */ }

// Channel-specific tracking
if (!Object.keys(config.CHANNELS).includes(message.channel.id) && 
    !Object.keys(state.tempChannels).includes(message.channel.id)) return false;

// Ban enforcement at message level
const user = await prisma.user.findUnique({ where: { id: message.author.id } });
if (user?.banned) return false;
```

## Performance Optimizations

### Memory Management & Compression
```javascript
// LZ-string compression for conversation history (70%+ reduction)
const historyString = lzstring.compressToBase64(JSON.stringify(history));
const history = JSON.parse(lzstring.decompressFromBase64(result.history));

// Automatic file cleanup
await deleteArtifacts(); // Remove SVG/code artifacts
await deleteUploadedItems(); // Clean Gemini uploaded files
const cleanedHistory = history.filter(message => !message.parts?.some(part => part.fileData));

// User cache with automatic invalidation
if (state.usersCache[userId]) { delete state.usersCache[userId]; }
```

### Concurrency Control & Queue Management
```javascript
// Per-channel message processing queues prevent race conditions
if (state.isProcessing[channelId]) return; // Skip if already processing
state.isProcessing[channelId] = true;

// Queue processing with error isolation
while (state.messageQueues[channelId].length > 0) {
    const task = state.messageQueues[channelId][0];
    try { await _internalMessageHandler(task.message, task.client, task.gemini); }
    finally { state.messageQueues[channelId].shift(); }
}
```

### Database Optimization & Caching
```javascript
// Prisma upsert patterns for user management
await prisma.user.upsert({
    where: { id }, update: { repPoint }, create: { id, repPoint }
});

// Efficient history trimming with user/model alternation enforcement
while (state.history[channelId].length > config.MAX_MESSAGES) {
    state.history[channelId].shift();
}
if (state.history[channelId][0]?.role !== 'user') {
    // Remove messages until first is user (Gemini requirement)
}
```

### Reputation System & Bond Levels
```javascript
// Cumulative message requirements for bond progression
function calcRequiredMsgs(bondLvl) {
    return config.CUMULATIVE_MODE === "classic" ? firstGiftCount * bondLvl : 
           config.CUMULATIVE_MODE === "noise" ? Math.floor(Math.random() * 100) + 1 :
           config.CUMULATIVE_MODE === "worse" ? firstGiftCount * Math.pow(2, bondLvl) : firstGiftCount;
}

// Automatic reputation decay for inactive users (7+ days)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
if (user.lastInteraction < sevenDaysAgo && !user.decayed) {
    await prisma.user.update({ data: { repPoint: user.repPoint - 2, decayed: true } });
}
```

## Sleeping Mode & Scheduling
```javascript
// Cron-like sleep scheduling with presence updates
function schedSleep(range, client) { // Format: "22:30-6:00"
    const [startStr, endStr] = range.split('-');
    // Handles overnight ranges and same-day ranges
    if (shouldBeSleeping && !state.isSleeping) {
        state.isSleeping = true;
        await botSleeping(client, wakeTimeStr);
    }
}

// Daily summary generation during sleep
await createSummariesAndClearHistories(); // Generate summaries and clean temp channels
```

## File Upload & SVG Processing

### Discord File Upload Pipeline (`eventHandlers/fileUploader.js`)
```javascript
// Upload Discord attachments to Gemini File API with progress tracking
async function uploadFile(message, attachment) {
    await message.react(state.emojis.uploading); // Progress indicator
    const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
    const uploadResult = await fileManager.uploadFile(attachment.url, {
        mimeType: attachment.contentType,
        displayName: attachment.name
    });
    await message.reactions.removeAll();
    await message.react(state.emojis.uploaded); // Success indicator
    return uploadResult.file.uri;
}
```

### SVG to PNG Conversion (`utils/svg2png.js`)
```javascript
// SVG validation and PNG conversion using Sharp
function validateSVG(svgContent) {
    if (!svgContent.includes('<svg')) return { valid: false, reason: "No <svg> tag found" };
    if (!svgContent.includes('width=') || !svgContent.includes('height=')) 
        return { valid: false, reason: "Missing width or height attributes" };
    return { valid: true };
}

// Convert SVG to PNG with background handling
const buffer = await sharp(Buffer.from(svgContent))
    .flatten({ background: '#FFFFFF' }) // White background for transparency
    .png()
    .toBuffer();
```

### Sandbox Terminal Execution (`utils/boxie.js`)
```javascript
// Containerized command execution with security isolation
if (!config.ALLOW_SANDBOX) return "Sandbox execution is disabled";
const result = await exec(`echo "${command}" | timeout 30s boxie`, { 
    maxBuffer: 1024 * 1024, // 1MB output limit
    timeout: 30000 // 30 second timeout
});
// Boxie provides isolated environment for command execution
```

This comprehensive architecture enables Domain-Unchained to handle high-volume Discord servers while maintaining conversation context, executing complex AI-powered moderation, providing real-time monitoring capabilities, and ensuring robust error handling and performance optimization.

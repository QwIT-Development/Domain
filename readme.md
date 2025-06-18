# Domain - Gemini Powered Discord Chatbot

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)

Domain is a feature-rich Discord chatbot powered by Google's Gemini API. It's designed to be highly configurable and extensible, offering a wide array of functionalities to enhance your Discord server.

## Features

*   **AI-Powered Conversations:** Utilizes Google's Gemini API for intelligent and context-aware chat responses.
*   **Smart Context Gathering:** Employs sophisticated methods to understand conversation context for more relevant interactions.
*   **Reputation System:** Allows users to build and track reputation within the server.
*   **Image Generation:** Capable of generating images, including SVG for free-tier users.
*   **User Moderation:** Includes features for timing out users.
*   **Code Snippet Handling:** Can understand and process snippets from code blocks.
*   **File & Picture Understanding:** Ability to interpret and react to uploaded pictures and files.
*   **WebUI:** A comprehensive web interface for:
    *   Viewing logs.
    *   Managing bans.
    *   Viewing reputation.
    *   Real-time server statistics.
    *   Live configuration editing.
*   **Customizable Prompts:** Supports different prompts per channel for tailored bot behavior.
*   **Extensive Configuration:** Highly configurable through `config.json` and the WebUI.
*   **Emoji Management:** Resolves and utilizes custom emojis.
*   **Banned Site Filtering:** Filters messages containing links to banned sites.
*   **"Thinking" Indicator:** Shows when the bot is processing a request.
*   **Sleeping Mode:** Can be set to be inactive during specified hours.
*   **Proxy Support:** Allows routing traffic through proxies.
*   **Remote Blocklists:** Can fetch and use remote domain blocklists.

## Getting Started

### Prerequisites

*   [Bun](https://bun.sh/) installed.
*   A Discord Bot Token.
*   A Google Gemini API Key.

### Installation & Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url> --recursive
    cd Domain
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Prepare configuration file:**
    *   Create an empty `config.json`. This file will store your bot's configuration.

4.  **Set up Prisma (Database):**
    The project uses Prisma for database interactions. Ensure your database is set up according to your `prisma/schema.prisma` file.
    *   Initialize your database and run migrations:
        ```bash
        bunx prisma deploy
        ```

5.  **Start the bot:**
    ```bash
    bun start
    ```

6.  **Initial Configuration via WebUI:**
    *   Once the bot is running, open your web browser and navigate to the WebUI. By default, it should be accessible at `http://localhost:4500`. If you changed `WEBUI_PORT` in `template.config.json` before renaming it, use that port.
    *   Through the WebUI, you can set your `DISCORD_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, define bot `ALIASES`, specify active `CHANNELS`, and configure other core settings.
    *   The WebUI is the recommended method for initial setup and managing most configurations.

## Usage

Once the bot is running and configured for your channels, you can interact with it by mentioning one of its aliases. The bot will use the Gemini API to generate responses based on the conversation and its configured prompt for that channel.

### Commands

The bot primarily interacts through natural language. However, some slash commands are available:
*   `/amibanned`: Checks if the user is banned.
*   `/reputation`: Checks user reputation.
*   `/reset`: (Owner only) Resets bot's memory/context.
*   `/version`: Displays the bot's version.

(More commands might be available or under development.)

## Configuration (`config.json`)

The `config.json` file holds all configuration settings for Domain. While the [WebUI](#webui) is the primary and recommended way for initial setup and many ongoing adjustments (including live editing for some settings), this section serves as a detailed reference for all available parameters. You might refer to this for advanced configurations or if you prefer manual editing.

*   `DISCORD_TOKEN`: **Required.** Your Discord application's bot token.
*   `GEMINI_API_KEY`: **Required.** Your API key for the Google Gemini service.
*   `GEMINI_MODEL`: **Required.** Specifies the Gemini model to use.
*   `ALIASES`: An array of strings. The bot will respond if a message starts with one of these aliases.
*   `CHANNELS`: An array of Discord channel IDs where the bot will be active.
*   `PROMPT_PATHS`: An object mapping channel IDs to `.md` or `.txt` prompt files located in the `/prompts` directory. This allows for different bot personalities or instructions per channel.
*   `LOCALE`: Sets the locale for the bot, affecting language and regional settings.
*   `WIKI_URLS`: Configuration for specific wiki URLs to be used by the bot, potentially for context or search.
*   `WEBUI_PORT`: The port number on which the WebUI will run.
*   `OWNERS`: An array of Discord user IDs that have administrative privileges over the bot.
*   `TIMINGS`:
    *   `saveReps`: Interval in seconds for saving reputation data.
    *   `resetPrompt`: Interval in seconds for resetting/reloading the prompt.
    *   `userCacheDuration`: Duration in milliseconds for caching user data.
*   `SEARX_BASE_URL`: Base URL for a SearXNG instance if you want the bot to use it for web searches.
*   `EMOJIS`: IDs for custom emojis used by the bot for various indicators (uploaded, upvote, downvote, search, mute, uploading).
*   `MAX_MESSAGES`: Maximum number of messages to keep in history for context.
*   `SLEEPINGRANGE`: A time range (e.g., "22:30-6:00") during which the bot will be inactive.
*   `PROXIES`: Array of proxy configurations for network requests.
*   `REMOTE_LISTS`: URLs to remote blocklists (e.g., for ad/porn domains).
*   `ENABLE_THINKING`: Boolean to enable/disable the "bot is thinking" indicator.
*   `TOS_URL`: Link to a Terms of Service document, if applicable.
*   `CUMULATIVE_MODE`: Mode for message accumulation (e.g., "classic").

Refer to `template.config.json` for a full list of available options and their structure.

## WebUI

Domain includes a powerful WebUI accessible via `http://localhost:<WEBUI_PORT>` (as configured in `config.json`).

**Features of the WebUI:**

*   **Dashboard:** Overview of bot status and statistics.
*   **Logs:** View real-time logs from the bot.
*   **Ban Management:** View and manage banned users.
*   **Reputation Viewer:** Inspect user reputations.
*   **Configuration Editor:** Modify `config.json` settings live (requires bot restart for some changes to take effect).
*   **System Controls:** Access to functions like manual garbage collection (`gc`) or heap dumps for debugging.
*   **Real-time Stats:** WebSocket-based live updates of bot and system performance.

**Note:** The WebUI is not secured by default. Do not expose the `WEBUI_PORT` to the public internet without implementing proper security measures (e.g., a reverse proxy with authentication).

## Project Structure

The project is organized into several key directories:

*   `commands/`: Slash command handlers.
*   `cronJobs/`: Scheduled tasks.
*   `data/`: Static data files and runtime data storage.
*   `eventHandlers/`: Handlers for Discord events (message creation, etc.).
*   `functions/`: Core bot logic and utility functions.
*   `initializers/`: Scripts for setting up various components (Discord client, Gemini client, state).
*   `prisma/`: Prisma schema and migration files for database management.
*   `prompts/`: Markdown or text files used as system prompts for the Gemini model.
*   `utils/`: General utility scripts.
*   `webui/`: Contains all files related to the Express.js based Web User Interface.
    *   `webui/api/`: API endpoints for the WebUI.
    *   `webui/views/`: EJS templates for rendering WebUI pages.
    *   `webui/css/`, `webui/js/`: Static assets for the WebUI.

## Contributing

Contributions are welcome! Please refer to the project's issue tracker on GitHub for areas where you can help. If you plan to add a new feature or make significant changes, please open an issue first to discuss your ideas.

## License

This project is licensed under the GNU Affero General Public License v3.0 or later. See the [LICENSE.md](LICENSE.md) file for details.

## Support

*   **Support Channel (Matrix):** [#domainsupport:anchietae.cc](https://matrix.to/#/#domainsupport:anchietae.cc)
*   **Wiki & Further Information:** [GitHub Wiki](https://github.com/QwIT-Development/Domain/wiki)
*   **Issues:** [GitHub Issues](https://github.com/QwIT-Development/Domain/issues)

# Domain - Gemini Powered Discord Chatbot

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=QwIT-Development_Domain&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=QwIT-Development_Domain)
[![Crowdin](https://badges.crowdin.net/domain-unchained/localized.svg)](https://crowdin.com/project/domain-unchained)

Domain is a feature-rich Discord chatbot powered by Google's Gemini API. It's designed to be highly configurable and extensible, offering a wide array of functionalities to enhance your Discord server.

> [!IMPORTANT]
> For people coming from SoM, since resources are limited and we have a whitelist where the bot works, we strongly encourage users to selfhost the bot

## Features

*   **AI-Powered Conversations:** Utilizes Google's Gemini API for intelligent and context-aware chat responses.
*   **Smart Context Gathering:** Employs sophisticated methods to understand conversation context for more relevant interactions.
*   **Reputation System:** Allows users to build and track reputation within the server.
*   **Image Generation:** Capable of generating images from SVG code.
*   **User Moderation:** Includes features for timing out users.
*   **Code Snippet Handling:** Can understand and process snippets from code blocks.
*   **File & Picture Understanding:** Ability to interpret and react to uploaded pictures and files.
*   **WebUI:** A comprehensive web interface for:
    *   Viewing logs.
    *   Managing bans.
    *   Viewing reputation.
    *   Real-time server statistics.
*   **Customizable Prompts:** Supports different prompts per channel for tailored bot behavior.
*   **Extensive Configuration:** Highly configurable through the `config.toml`.
*   **Emoji Management:** Resolves and utilizes custom emojis.
*   **Banned Site Filtering:** Filters messages containing links to banned sites.
*   **"Thinking" Indicator:** Shows when the bot is processing a request.
*   **Sleeping Mode:** Can be set to be inactive during specified hours.
*   **Proxy Support:** Allows routing traffic through proxies.
*   **Remote Blocklists:** Can fetch and use remote domain blocklists.

## Getting Started

### Prerequisites

*   [**Docker**](https://docs.docker.com/engine/install/) installed.
*   A Discord Bot Token.
*   A Google Gemini API Key.
*   **Linux**: A Linux environment is recommended for running Domain, but it can also run on Windows or macOS with Docker.

### Installation & Setup

1. **Create a directory for Domain**:
   ```bash
   mkdir domain
   cd domain
   ```
2. **Create basic directories and files**:
   ```bash
   mkdir data
   mkdir prompts
   touch config.toml
   ```
3. Copy the template configuration (Optional)
4. **Copy docker-compose.yml to the directory**
5. If you are not running it on Linux, you may want to remove `/etc/timezone` and `/etc/localtime` from the `docker-compose.yml` file to avoid timezone issues.
6. **Start the bot with docker compose**:
    ```bash
    docker compose up -d
    ```

## Usage

Once the bot is running and configured for your channels, you can interact with it by mentioning one of its aliases. The bot will use the Gemini API to generate responses based on the conversation and its configured prompt for that channel.

### Commands

The bot primarily interacts through natural language. However, some slash commands are available:
*   `/amibanned`: Checks if the user is banned.
*   `/reputation`: Checks user reputation.
*   `/reset`: (Owner only) Resets bot's context history.
*   `/version`: Displays the bot's version.
*   `/summarize`: Returns the last summarization of the day.

(More commands might be available or under development.)

## Configuration (`config.toml`)

The `config.toml` file holds all configuration settings for Domain. It is the primary and recommended way for initial setup and many ongoing adjustments, this section serves as a detailed reference for all available parameters. You might refer to this for advanced configurations or if you prefer manual editing.

Refer to `template.config.toml` for a full list of available options and their structure.

## WebUI

Domain includes a powerful WebUI accessible via `http://localhost:4500`

**Features of the WebUI:**

*   **Dashboard:** Overview of bot status and statistics.
*   **Logs:** View real-time logs from the bot.
*   **Ban Management:** View and manage banned users.
*   **Reputation Viewer:** Inspect user reputations.
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

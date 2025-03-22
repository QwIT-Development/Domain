# <img src="https://github.com/user-attachments/assets/b4c1f045-e2c6-4b8d-90ae-a5fb40c32e4e" alt width="100px"> Domain

Egy szebb, szétszedettebb codebase, hogy könnyebben menjen a fejlesztés

Config leírás:
```json5
{
  "DISCORD_TOKEN": "", // discord bot token, https://discord.com/developers/applications
  "GEMINI_API_KEY": "", // gemini api token, https://aistudio.google.com/apikey
  "GEMINI_MODEL": "", // ai model, https://ai.google.dev/gemini-api/docs/models/#model-variations
  "ALIASES": [], // nevei a botnak (pl.: ["domain", "dave"]), ezekre fog válaszolni
  "CHANNELS": [], // csatorna idk, amelyiket követi a bot (stringként várja az idket)
  "GUILD_ID": "", // szerver id (timeoutra és egyebekre)
  "PROMPT_PATH": "", // prompt nevét várja, ami a ./prompts mappában van
  "LOCALE": "", // nyelv, pár dologhoz, pl dátum (hu-HU, en-US, stb.)
  "WIKI_URLS": [], // urlek, amiből a bot információkat fog szedni
  "PROXIES": [ // opcionális, lehet [] ha nem akarsz proxyzni, proxy lista, ha el akarnád kerülni, hogy leakelve legyen az ipd
    {
      "host": "", // host ip/hostname
      "port": "", // port
      "protocol": "http", // protokoll (http, https)
      "auth": { // authentikáció (opcionális)
        "username": "", // felhasználónév
        "password": "" // jelszó
      }
    }
  ]
}
```
# <img src="https://github.com/user-attachments/assets/b4c1f045-e2c6-4b8d-90ae-a5fb40c32e4e" alt width="100px"> Domain

Egy szebb, szétszedettebb codebase, hogy könnyebben menjen a fejlesztés

## Config leírás:
**DISCORD_TOKEN** - *string* - discord bot token, https://discord.com/developers/applications<br>
**GEMINI_API_KEY** - *string* - gemini api token, https://aistudio.google.com/apikey<br>
**GEMINI_MODEL** - *string* - ai model, https://ai.google.dev/gemini-api/docs/models/#model-variations<br>
**ALIASES** - *list* - nevei a botnak (pl.: `["domain", "dave"]`), ezekre fog válaszolni<br>
**CHANNELS** - *list* - csatorna, amelyeket követi a bot (stringként várja az idket)<br>
**GUILD_ID** - *string* - szerver id (timeoutra és egyebekre)<br>
**PROMPT_PATH** - *string* - prompt nevét várja, ami a `./prompts` mappában van<br>
**LOCALE** - *string* - nyelv, pár dologhoz, pl dátum (`hu-HU`, `en-US`, [teljes lista](https://simplelocalize.io/data/locales/))<br>
**WIKI_URLS** - *list* - urlek, amiből a bot információkat fog szedni<br>
**WEBUI_PORT** - *int* - kezelőpult portja<br>
**PROXIES** - *list* - opcionális, lehet `[]` ha nem akarsz proxyzni, proxy lista, ha el akarnád kerülni, hogy leakelve legyen az ipd

PROXIES lista felépítése:
```json5
  "PROXIES": [
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
```


## Működőképessé tétel:
1. `pnpm i` - Használj [pnpm](https://pnpm.io/) (ne npmet, trust me)
2. Csinálj egy promptot a `./prompts` mappába (ajánlott a gemini modellel átiratni, amit használni fogsz, mert az tudja hogy mivel lesz kompatibilisebb saját magával)
3. Állíts be mindent a configban (ne felejtsd el átnevezni a `template.config.json`-t `config.json`-ra)
4. `bun run index.js` - Elindítja a botot (használj [bun](https://bun.sh/)-t sokkal gyorsabb)

Ha nem tetszik valami a botnak úgy is pampogni fog

## Disclaimer:
- Olvasd át a kódot, mert prompt íráshoz kelleni fog pár dolog majd (példa: `./eventHandlers/messageHandler.js`)
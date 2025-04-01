# <img src="https://github.com/user-attachments/assets/b4c1f045-e2c6-4b8d-90ae-a5fb40c32e4e" alt width="100px"> Domain

Epicest Intelligent Assistant for Discord

[for more information, refer to wiki](https://github.com/QwIT-Development/Domain/wiki)

## Működőképessé tétel:
1. `pnpm i` - Használj [pnpm](https://pnpm.io/) (ne npmet, trust me)
2. Csinálj egy promptot a `./prompts` mappába (ajánlott a gemini modellel átiratni, amit használni fogsz, mert az tudja hogy mivel lesz kompatibilisebb saját magával)
3. Állíts be mindent a configban (ne felejtsd el átnevezni a `template.config.json`-t `config.json`-ra)
4. `bun run index.js` - Elindítja a botot (használj [bun](https://bun.sh/)-t sokkal gyorsabb)

Ha nem tetszik valami a botnak úgy is pampogni fog

## Disclaimer:
- Olvasd át a kódot, mert prompt íráshoz kelleni fog pár dolog majd (példa: `./eventHandlers/messageHandler.js`)

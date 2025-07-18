/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { randomInt } = require("crypto");

// ja hogy megnyomom a tabot es rak egy ilyet
// bruh
/**
 * sends a request with a proxy
 * @async
 * @param url
 * @returns  {data: any, proxyUsed: string, usingProxy: boolean}
 * @async
 *
 * @desc
 * returns a *data* (you need this) and a *proxyUsed* string (you don't need this) and a *usingProxy* boolean (you might need this)
 */
async function fetchWithProxies(url) {
  const proxies = config.PROXIES || [];

  if (proxies.length === 0) {
    try {
      console.warn("No proxies available, using direct connection.");
      const response = await fetch(url);
      const data = await response.text();
      return {
        data: data,
        proxyUsed: "none",
        usingProxy: false,
      };
    } catch (error) {
      throw new Error(`Direct connection failed: ${error.message}`);
    }
  }

  for (const proxy of proxies) {
    try {
      const proxyString = `${proxy.protocol || "http"}://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`;

      const response = await fetch(url, {
        proxy: proxyString,
        headers: {
          "User-Agent": userAgent(),
          "X-Forwarded-For": proxy.host,
          "X-Real-IP": proxy.host,
        },
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.text();

      if (data) {
        return {
          data: data,
          proxyUsed: `${proxy.host}:${proxy.port}`,
          usingProxy: true,
        };
      }
    } catch (error) {
      console.error(`Proxy ${proxy.host}:${proxy.port} failed:`, error.message);
    }
  }

  console.warn("No more proxies to try...");
  try {
    const response = await fetch(url);
    const data = await response.text();
    return {
      data: data,
      proxyUsed: "none",
      usingProxy: false,
    };
  } catch (error) {
    throw new Error(`Direct connection failed: ${error.message}`);
  }
}

/**
 * Literally returns a random user agent from a predefined list.
 * @returns string
 */
function userAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:136.0) Gecko/20100101 Firefox/136.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
  ];

  const rng = randomInt(userAgents.length);
  return userAgents[rng];
}

module.exports = fetchWithProxies;

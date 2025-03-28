/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/

const axios = require('axios');
const config = require('../config.json');

// ja hogy megnyomom a tabot es rak egy ilyet
// bruh
/**
 * kérést küld egy szerver felé proxyval
 * @async
 * @param url
 * @returns  {data: any, proxyUsed: string, usingProxy: boolean}
 * @async
 *
 * @desc
 * visszaad egy *data*-t (ez kell neked) és e mellé egy proxyUsed-et (fölös) és egy usingProxy-t (lehet kell)
 */
async function fetchWithProxies(url) {
    const proxies = config.PROXIES || [];

    if (proxies.length === 0) {
        try {
            console.warn('No proxies available, using direct connection.');
            const response = await axios.get(url);
            return {
                data: response.data,
                proxyUsed: 'none',
                usingProxy: false
            };
        } catch (error) {
            throw new Error(`Direct connection failed: ${error.message}`);
        }
    }

    for (const proxy of proxies) {
        try {
            const httpsProxyAgent = require('https-proxy-agent');
            const httpProxyAgent = require('http-proxy-agent');

            const agentOptions = {
                host: proxy.host,
                port: proxy.port,
                protocol: proxy.protocol || 'http:',
                auth: `${proxy.auth.username}:${proxy.auth.password}`
            };

            // noinspection JSCheckFunctionSignatures
            const httpsAgent = new httpsProxyAgent.HttpsProxyAgent(agentOptions);
            // noinspection JSCheckFunctionSignatures
            const httpAgent = new httpProxyAgent.HttpProxyAgent(agentOptions);

            const axiosInstance = axios.create({
                proxy: false,
                headers: {
                    'User-Agent': userAgent(),
                    'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.auth.username}:${proxy.auth.password}`).toString('base64')}`,
                    'X-Forwarded-For': proxy.host,
                    'X-Real-IP': proxy.host
                },
                timeout: 10000,
                httpsAgent: url.startsWith('https') ? httpsAgent : false,
                httpAgent: url.startsWith('http:') ? httpAgent : false
            });

            const response = await axiosInstance.get(url);

            if (response.data) {
                return {
                    data: response.data,
                    proxyUsed: `${proxy.host}:${proxy.port}`,
                    usingProxy: true
                };
            }
        } catch (error) {
            console.error(`Proxy ${proxy.host}:${proxy.port} failed:`, error.message);
        }
    }

    console.warn('No more proxies to try...');
    try {
        const response = await axios.get(url);
        return {
            data: response.data,
            proxyUsed: 'none',
            usingProxy: false
        };
    } catch (error) {
        throw new Error(`Direct connection failed: ${error.message}`);
    }
}


/**
 * Literálisan egy darab ua-t ad vissza
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
        "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0"
    ];

    const rng = Math.floor(Math.random() * userAgents.length);
    return userAgents[rng];
}

module.exports = fetchWithProxies;
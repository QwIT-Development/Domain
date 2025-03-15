const axios = require('axios');
const proxies = require('../data/proxies.json');

async function fetchWithProxies(url) {
    if (proxies.length === 0) {
        const response = await axios.get(url);
        return response.data;
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

            const httpsAgent = new httpsProxyAgent.HttpsProxyAgent(agentOptions);
            const httpAgent = new httpProxyAgent.HttpProxyAgent(agentOptions);

            const axiosInstance = axios.create({
                proxy: false,
                headers: {
                    // legit useragent
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                    'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.auth.username}:${proxy.auth.password}`).toString('base64')}`,

                    // shitty try at modifying the ip
                    // I mean, it does indeed look real, like a shitty buildup
                    // so it should look like this: proxy, home network, internal network, docker network, public ip? (yeah fuck the rfc that wanted to forward the real ip)
                    'X-Forwarded-For': proxy.host + ", 192.168.1.31, 10.0.0.3, 172.18.0.12",
                    'X-Real-IP': proxy.host + ", 192.168.1.31, 10.0.0.3, 172.18.0.12"
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

    console.log('no more proxies to try');
    try {
        const response = await axios.get(url);
        return {
            data: response.data,
            proxyUsed: 'none',
            usingProxy: false
        };
    } catch (error) {
        throw new Error('direct connection failed too :(');
    }
}

/*
async function test() {
    try {
        const result = await fetchWithProxies('https://httpbin.org/anything');
        console.log(result.proxyUsed);
        console.log(result.data);
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
*/

module.exports = fetchWithProxies;
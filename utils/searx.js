/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025  BalazsManus
*/


const axios = require('axios');
const {convert} = require('html-to-text');
const config = require('../config.json');
const state = require('../initializers/state');
const log = require('./betterLogs');
const cheerio = require('cheerio');

const options = {
    wordwrap: 130,
    selectors: [
        { selector: 'h1' },
        { selector: 'h2' },
        { selector: 'h3' },
        { selector: 'h4' },
        { selector: 'h5' },
        { selector: 'h6' },
        { selector: 'p' },
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'ul' },
        { selector: 'ol' },
        { selector: 'table' },
    ]
};

async function search(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await axios.get(`${config.SEARX_BASE_URL}/search?q="${encodedQuery}"&format=json`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
            }
        });

        if (!response.data || !response.data.results) {
            return "No results found.";
        }
        // put 15 results to mem
        // idk, we dont really need more
        const results = response.data.results.slice(0, 15);
        console.log(results);

        const result1Context = await getContext(results[0].url);
        console.log(result1Context);
        const result2Context = await getContext(results[1].url);
        console.log(result2Context);

        const output = results.map((result, index) => {
            let resultOutput = `${index + 1}. ${result.title}\n   ${result.url}\n   ${result.content}\n`;
            if (index === 0 && result1Context !== null) {
                resultOutput += `\nContext for result:\n${result1Context}\n`;
            }
            if (index === 1 && result2Context !== null) {
                resultOutput += `\nContext for result:\n${result2Context}\n`;
            }
            return resultOutput;
        }).join('\n');

        console.log(output);
        return output;

    } catch (e) {
        console.log("szar lehet");
        return e.message;
    }
}

async function getContext(url) {
    if (state.bannedSites.some((bannedDomain) => {
       const extract = extractDomain(url);
       // return true if its banned or invalid
       return bannedDomain === extract && extract === "invalid";
    })) {
        log(`Skipping banned site: ${url}`, 'warn', 'searx.js');
        return "Blocked website";
    }

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        // check if page has id=mw-content-text and class=mw-body-content
        let content = $('#mw-content-text.mw-body-content').html();
        if (!content) {
            return convert(response.data, options);
        } else {
            log(`We got a wikipedia page...`, 'infoWarn', 'searx.js');
            // if website is a wikipedia page, we do a lot of stuff
            content = convert(content, options);
            // remove [edit] links
            content = content.replaceAll(/\[([^\]]+)]/g, '').trim();
            // make it prettier
            content = content.replaceAll('\n\n\n', '').trim();
            // extra trim for good measure
            return content.trim()
        }

    } catch (e) {
        log(`Error getting context: ${e}`, 'error', 'searx.js');
        return "Error getting context";
    }
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return "invalid";
    }
}

module.exports = {getContext, search};
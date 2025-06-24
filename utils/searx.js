/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


const { convert } = require('html-to-text');
const {loadConfig} = require('../initializers/configuration');
const config = loadConfig();
const state = require('../initializers/state');
const log = require('./betterLogs');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');

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

async function callGemini(genAI, prompt, configOverride = {}) {
    const defaultConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'text/plain'
    };

    const mergedConfig = { ...defaultConfig, ...configOverride };

    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await genAI.models.generateContentStream({
                model: 'gemini-2.0-flash-lite',
                config: mergedConfig,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            let responseText = '';
            for await (const chunk of response) {
                if (chunk.text) {
                    responseText += chunk.text;
                }
            }
            return responseText;
        } catch (error) {
            if (error.message?.includes('500')) {
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.warn(`Gemini call failed after ${maxRetries} retries.`);
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }
}

async function search(query, genAI) {
    try {
        log(`Starting search for query: "${query}"`, 'info', 'searx.js');

        const encodedQuery = encodeURIComponent(query);
        let response = await fetch(`${config.SEARX_BASE_URL}/search?q="${encodedQuery}"&format=json`, {
            headers: { "User-Agent": `Mozilla/5.0 (compatible; Domain-Unchained/${state.version}; +https://github.com/QwIT-Development/Domain) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36` }
        });
        response = await response.json();

        if (!response?.results) {
            log('No search results found', 'warn', 'searx.js');
            return "No results found.";
        }

        const rawResults = response.results.slice(0, 20);
        const relevantResults = await analyzer(genAI, query, rawResults);
        const topResults = relevantResults.slice(0, 5);

        const enhancedResults = await Promise.allSettled(
            topResults.map(async (result, index) => ({
                ...result,
                context: await generateContext(genAI, result.url, query),
                rank: index + 1
            }))
        );

        const successfulResults = enhancedResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        if (successfulResults.length === 0) {
            log('No successful context extraction', 'warn', 'searx.js');
            return "Search completed but no detailed context could be extracted.";
        }

        const finalSummary = await summarizer(genAI, query, successfulResults);
        return finalSummary;

    } catch (e) {
        console.error(`Search error: ${e.message}`);
        return `Search failed: ${e.message}`;
    }
}

async function analyzer(genAI, query, results) {    const prompt = `Analyze these search results for the query: "${query}"

Search Results:
${results.map((result, index) =>
        `${index + 1}. Title: ${result.title}\n   URL: ${result.url}\n   Content: ${result.content}\n   Engine: ${result.engine || 'unknown'}`
    ).join('\n\n')}

Rank these results by relevance to the query. Consider:
1. How well the title matches the query intent
2. How relevant the content snippet is
3. Whether the content directly answers the query

Return ONLY a JSON array of result indices (1-based) in order of relevance. No explanations, no markdown formatting, just the raw JSON array.
Example format: [3, 1, 7, 2, 5]
Include at most 8 results in your ranking.`;
try {
        const responseText = await callGemini(genAI, prompt, {
            temperature: 0.5, topP: 0.8, maxOutputTokens: 200
        });

        // remove markdown formatting if gemini is edging
        let jsonText = responseText.trim();
        const markdownMatcher = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/;
        const jsonMatch = markdownMatcher.exec(jsonText);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
            jsonText = jsonText.slice(3, -3).trim();
            if (jsonText.startsWith('json')) {
                jsonText = jsonText.slice(4).trim();
            }
        }

        const ranking = JSON.parse(jsonText);
        return ranking
            .filter(index => index >= 1 && index <= results.length)
            .map(index => results[index - 1]);

    } catch (e) {
        log(`Error analyzing search results: ${e.message}`, 'warn', 'searx.js');
        return results.slice(0, 8);
    }
}

async function generateContext(genAI, url, query) {
    const basicContext = await getContext(url);

    if (basicContext === "Invalid website" ||
        basicContext === "Blocked website" ||
        basicContext === "Blocked by robots.txt" ||
        basicContext === "Error getting context" ||
        !basicContext || basicContext.trim().length < 50) {
        return basicContext;
    }

    const prompt = `Extract the most relevant information from this webpage content for the query: "${query}"

Webpage Content:
${basicContext}

Instructions:
1. Focus on information that directly answers or relates to the query
2. Include key facts, definitions, explanations, or data points
3. Preserve important context and details
4. Remove irrelevant navigation, ads, or boilerplate text
5. Keep the response concise but informative (max 800 words)
6. If the content doesn't relate to the query, briefly explain what the page is about

Extract the relevant information:`;
    try {
        const extractedContent = await callGemini(genAI, prompt);
        return extractedContent;

    } catch (e) {
        log(`Error enhancing context for ${url}: ${e.message}`, 'warn', 'searx.js');
        return basicContext.length > 1500 ? basicContext.substring(0, 1500) + "..." : basicContext;
    }
}

async function summarizer(genAI, query, results) {
    const prompt = `Create a comprehensive answer based on these search results for the query: "${query}"

Search Results:
${results.map((result, index) =>
        `Result ${result.rank}: ${result.title}\nURL: ${result.url}\nSummary: ${result.content}\n\nDetailed Content:\n${result.context}\n\n---`
    ).join('\n')}

Instructions:
1. Synthesize information from all sources to provide a complete answer
2. Cite sources by mentioning the website names or URLs when referencing specific information
3. If results contradict each other, mention the different perspectives
4. Focus on directly answering the query
5. Include relevant details, facts, and explanations
6. Organize the information logically
7. If the query asks for recent information, prioritize newer sources
8. Keep the response informative but readable

Provide a comprehensive answer to: "${query}"`;
    try {
        const summary = await callGemini(genAI, prompt, {
            temperature: 0.4, maxOutputTokens: 8192
        });

        log(`Search summary created for query: ${query}`, 'info', 'searx.js');
        return summary;

    } catch (e) {
        console.warn(`Error creating search summary: ${e.message}`);

        const fallbackSummary = `Search results for "${query}":\n\n` +
            results.map((result, index) =>
                `${index + 1}. ${result.title}\n${result.url}\n${result.content}\n\nContent: ${result.context}\n`
            ).join('\n---\n');

        return fallbackSummary;
    }
}

async function getContext(url) {
    const domain = extractDomain(url);

    if (domain === "invalid") {
        log(`Skipping invalid url: ${url}`, 'warn', 'searx.js');
        return "Invalid website";
    }

    if (state.bannedSitesExact.has(domain) ||
        state.bannedSitesWildcard.some(suffix => domain.endsWith(suffix))) {
        log(`Skipping banned site: ${url}`, 'warn', 'searx.js');
        return "Blocked website";
    }

    try {
        const robotUrl = `${new URL(url).origin}/robots.txt`;
        const userAgent = "Domain-Unchained"; // this shouldn't include the version, so it is easier to block
        const robots = robotsParser(robotUrl, await fetch(robotUrl).then(res => res.text()).catch(() => ""));
        if (!robots.isAllowed(url, userAgent)) {
            log(`Skipping site due to robots.txt: ${url}`, 'warn', 'searx.js');
            return "Blocked by robots.txt";
        }

        let response = await fetch(url);
        response = await response.text();
        const $ = cheerio.load(response);

        // stolen content selectors for sites
        const contentSelectors = [
            '#mw-content-text.mw-body-content', // Wikipedia
            '.content', '.main-content', '#content', 'main', 'article',
            '.post-content', '.entry-content', '.article-body', '.story-body'
        ];

        let content = '';
        for (const selector of contentSelectors) {
            const selectedContent = $(selector).html();
            if (selectedContent && selectedContent.length > content.length) {
                content = convert(selectedContent, options);
                break;
            }
        }

        // fallback if selector failed
        if (!content || content.length < 100) {
            content = convert(response, options);
        }

        content = content
            .replaceAll(/\[([^\]]+)]/g, '') // remove wikipedia links
            .replaceAll(/\n{3,}/g, '\n\n') // remove excessive newlines
            .replaceAll(/(cookies? (policy|notice|banner)|accept (all )?cookies|privacy policy|terms of (service|use)|sign up for (our )?newsletter|subscribe to|follow us on|share this article|advertisement)/gi, '') // Remove boilerplate (source: gemini said so)
            .trim();

        // truncuate if content too long
        if (content.length > 12000) {
            const truncated = content.substring(0, 12000);
            const lastSentence = truncated.lastIndexOf('.');
            content = lastSentence > 8000 ? truncated.substring(0, lastSentence + 1) : truncated + "...";
        }

        return content.trim();

    } catch (e) {
        console.warn(`Error getting context from ${url}: ${e.message}`);
        return "Error getting context for search";
    }
}

function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return "invalid";
    }
}

module.exports = { getContext, search, callGemini };
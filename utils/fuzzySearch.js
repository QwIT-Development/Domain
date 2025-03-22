const Fuse = require('fuse.js');
const log = require('../utils/betterLogs');

function splitFuzzySearch(pattern, strings, options = {}) {
    if (!pattern || !strings || strings.length === 0) {
        return false;
    }

    const words = pattern.split(/\s+/);
    const wordMatches = [];

    for (const word of words) {
        log(`Checking word: ${word}`, 'info', 'fuzzySearch.js');
        const fuse = new Fuse(strings, options);
        const results = fuse.search(word);
        log(`Results: ${JSON.stringify(results)}`, 'info', 'fuzzySearch.js');

        wordMatches.push(results.length > 0 && results[0].score <= 0.2);
    }

    return wordMatches.every(match => match);
}

function fuzzySearch(pattern, strings, options = {}) {
    if (!pattern || !strings || strings.length === 0) {
        return false;
    }

    const fuse = new Fuse(strings, options);
    const results = fuse.search(pattern);

    return results.length > 0 && results[0].score <= 0.2;
}

module.exports = {fuzzySearch, splitFuzzySearch};
const Fuse = require('fuse.js');
const log = require('../utils/betterLogs');

function splitFuzzySearch(pattern, strings, options = {"includeScore": true}) {
    if (!pattern || !strings || strings.length === 0) {
        return false;
    }

    // split pharse into words, yes it works with dévid
    const words = pattern.match(/\S+/g);
    let allWordsMatch = false;

    for (const word of words) {
        const fuse = new Fuse(strings, options);
        const results = fuse.search(word);

        if (results.length > 0 && results[0].score <= 0.3) {
            allWordsMatch = true;
            break;
        }
    }

    return allWordsMatch;
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
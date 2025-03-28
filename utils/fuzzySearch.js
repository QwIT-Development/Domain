const Fuse = require('fuse.js');
const log = require('../utils/betterLogs');

/**
 * Fuzzy kereső, ami mondatot szétkapja és szavanként rákeres cucclira
 * @param pattern - string amit szétszed (ezen fog keresni)
 * @param strings - array, amiket keresni fog a *pattern*ben
 * @param options - fuzzy.js beállítások (ignorálható)
 * @returns {boolean}
 *
 * @desc
 * Ez visszaad majd egy booleant (true/false), attól függ h mennyire van közel találat *(ha betalál az jó)*
 */
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


/**
 * fuzzy kereső, **EGY SZÓRA** lett kitalálva
 * @param pattern - az egy darab szó (ez NEM szedi szét, erre használd inkább a `splitFuzzySearch`-t)
 * @param strings - keresendő szavak (arrayban)
 * @param options - fuzzy.js beállítások (ignorálható)
 * @returns {boolean} - true/false (előre finomhangolt)
 */
function fuzzySearch(pattern, strings, options = {}) {
    if (!pattern || !strings || strings.length === 0) {
        return false;
    }

    const fuse = new Fuse(strings, options);
    const results = fuse.search(pattern);

    return results.length > 0 && results[0].score <= 0.3;
}

module.exports = {fuzzySearch, splitFuzzySearch};
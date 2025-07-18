/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/

const Fuse = require("fuse.js");

/**
 * Fuzzy searcher, splits the phrase to words and searches
 * @param pattern - target phrase, we do searches on this
 * @param strings - array of strings to search for
 * @param options - fuzzy.js settings (ignorable)
 * @returns {boolean}
 *
 * @desc
 * This returns a true/false value based on whether the search was successful.
 */
function splitFuzzySearch(pattern, strings, minscore = 0.1) {
  if (!pattern || !strings || strings.length === 0) {
    return false;
  }

  // split pharse into words, yes it works with dévid
  // why regex? fuck split, some ppl just put double fucking spaces into their messages and line breaks
  // who put linebreaks into their messages
  const words = pattern.match(/\S+/g);
  let allWordsMatch = false;

  for (const word of words) {
    const cleanWord = word.replace(/[^\p{L}\p{N}_]/gu, "");
    if (cleanWord.length < 3) {
      continue;
    }

    const fuse = new Fuse(strings, { includeScore: true });
    const results = fuse.search(cleanWord);

    if (results.length > 0 && results[0].score <= minscore) {
      allWordsMatch = true;
      break;
    }
  }

  return allWordsMatch;
}

/**
 * fuzzy searcher, **THIS WAS MADE FOR A WORD ONLY**
 * @param pattern - the word, *for phrases, use splitFuzzySearch*
 * @param strings - array of strings to search for
 * @param options - fuzzy.js settings (ignorable)
 * @returns {boolean} - true/false (pre-tuned)
 */
function fuzzySearch(pattern, strings, minscore = 0.1) {
  if (!pattern || !strings || strings.length === 0) {
    return false;
  }

  const cleanWord = pattern.replace(/[^\p{L}\p{N}_]/gu, "");

  const fuse = new Fuse(strings, { includeScore: true });
  const results = fuse.search(cleanWord);

  return results.length > 0 && results[0].score <= minscore;
}

module.exports = { fuzzySearch, splitFuzzySearch };

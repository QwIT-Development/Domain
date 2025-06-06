/*
        Domain-Unchained, src of the discord bot, that uses gemini api to generate messages
        Copyright (C) 2025 Anchietae
*/


//epic rng generator, bc every code needs one!!1!
async function RNGArray(array) {
    const rng = Math.floor(Math.random() * array.length);
    return array[rng];
}

module.exports = {RNGArray}
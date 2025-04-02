async function RNGArray(array) {
    const rng = Math.floor(Math.random() * array.length);
    return array[rng];
}

module.exports = {RNGArray}
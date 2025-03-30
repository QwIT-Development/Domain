const axios = require('axios');
const {convert} = require('html-to-text');
const config = require('../config.json');

async function search(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await axios.get(`${config.SEARX_BASE_URL}/search?q="${encodedQuery}&format=json"`);

        if (!response.data || !response.data.results) {
            return "No results found.";
        }
        // put 15 results to mem
        // idk, we dont really need more
        const results = response.data.results.slice(0, 15);

        const takenOut = {
            "result1": results[0].url,
            "result2": results[1].url
        };


    } catch (e) {

    }
}
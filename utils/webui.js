const express = require('express');
const app = express();
const port = 4500;
const state = require('../initializers/state');
const {promptLoader, model} = require('../initializers/geminiClient');

app.use(express.static('./utils/webui'));

app.get('/api/usagestats/:id', async (req, res) => {
    const id = req.params.id;

    if (id === 'ram') {
        res.json({
            total: process.memoryUsage().heapTotal,
            used: process.memoryUsage().heapUsed
        });
    }

    if (id === 'messagecount') {
        res.json({
            count: state.msgCount
        })
    }
})

app.put('/api/lobotomize', async (req, res) => {
    const geminiModel = await model();
    let history = [];
    global.geminiSession = promptLoader(geminiModel, history);

    res.json({
        success: true
    });
});

app.listen(port, () => {
    console.log(`WebUI listening at http://localhost:${port}`)
});
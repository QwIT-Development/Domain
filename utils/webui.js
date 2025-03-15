const express = require('express');
const app = express();
const port = 4500;
const state = require('../initializers/state');

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

app.listen(port, () => {
    console.log(`WebUI listening at http://localhost:${port}`)
});
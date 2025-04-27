const getCurrentStats = require('../func/getCurrentStats');

const gc = async (req, res) => {
    const before = await getCurrentStats();
    const beforeUsed = before.ram.used;
    const beforeTotal = before.ram.total;
    if (Bun.gc) {
        Bun.gc(true);
    } else if (global.gc) {
        global.gc();
    } else {
        res.status(500).json({error: 'Garbage collection is unsupported'});
    }
    const after = await getCurrentStats();
    const diffUsed = after.ram.used - beforeUsed;
    const diffTotal = after.ram.total - beforeTotal;

    res.json({
        usedDiff: (diffUsed / 1024 / 1024).toFixed(2),
        totalDiff: (diffTotal / 1024 / 1024).toFixed(2),
    })
}

module.exports = gc;
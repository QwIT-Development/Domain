const path = require('path');
const v8 = require('v8');

const heapdump = (req, res) => {
    // Heap-${yyyymmdd}-${hhmmss}-${pid}-${thread_id}.heapsnapshot
    const heapFileName = `Heap-${new Date().toISOString().replace(/:/g, '-')}-${process.pid}-${process.threadId}.heapsnapshot`;
    const heapPath = path.join(global.dirname, 'data', 'running', 'tmp', heapFileName);
    const snapshotPath = v8.writeHeapSnapshot(heapPath);
    res.sendFile(path.join(global.dirname, snapshotPath));
}

module.exports = heapdump;
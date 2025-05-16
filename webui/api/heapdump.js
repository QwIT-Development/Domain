const path = require('path');
const v8 = require('v8');

const heapdump = async (req) => {
    // Heap-${yyyymmdd}-${hhmmss}-${pid}-${thread_id}.heapsnapshot
    const heapFileName = `Heap-${new Date().toISOString().replace(/:/g, '-')}-${process.pid}.heapsnapshot`;
    const heapPath = path.join(global.dirname, 'data', 'running', 'tmp', heapFileName);

    try {
        const snapshotPath = v8.writeHeapSnapshot(heapPath);
        const file = Bun.file(snapshotPath);
        if (await file.exists()) {
            return new Response(file, {
                headers: {
                    'Content-Disposition': `attachment; filename="${path.basename(snapshotPath)}"`,
                    'Content-Type': 'application/octet-stream'
                }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Failed to create or find heap snapshot file' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error('Heap dump failed:', error);
        return new Response(JSON.stringify({ error: 'Heap dump failed on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

module.exports = heapdump;
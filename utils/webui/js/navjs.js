function lobotomize() {
    fetch('/api/lobotomize', {
        method: 'PUT'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Message history cleared.');
            } else {
                alert('Failed to clear message history.');
            }
        })
        .catch(error => {
            console.error('Error resetting history:', error);
            alert('Failed to clear message history.');
        })
}

function garbageCollect() {
    fetch('/api/gc', {
        method: 'GET'
    })
        .then(response => response.json())
        .then(data => {
            const usedDiff = data.usedDiff;
            const totalDiff = data.totalDiff;
            alert(`Garbage collection completed. Diff:\nused: ${usedDiff} MB, total: ${totalDiff} MB`);
        })
}
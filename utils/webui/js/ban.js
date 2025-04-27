function ban() {
    const userId = document.getElementById('ban-userid').value;
    const reason = document.getElementById('ban-reason').value;
    const data = {
        id: userId,
        reason: reason
    };

    fetch('/api/ban', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('User banned.');
            } else {
                alert('Failed to ban user: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Failed to ban user:', error);
            alert('Failed to ban user.');
        });
}


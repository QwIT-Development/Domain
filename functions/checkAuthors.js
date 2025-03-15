async function checkAuthors(message, client) {
    // if bot send messsagre = bad
    if (message.author.bot) return false;

    // domain shouldn't reply to himself, bc it makes him look like a schizo
    if (message.author.id === client.user.id) return false;

    // if message start with //, it ignor
    if (message.content.startsWith('//')) return false;

    return true;
}

module.exports = checkAuthors;
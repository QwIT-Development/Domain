const config = require("../../config.json");
const state = require("../../initializers/state");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getUserInfo = require("./getUserInfo");
const usersCache = state.usersCache;

async function getEntry(userId) {
    const now = Date.now();
    let cachedUserInfo = usersCache[userId];
    let needsAPIRefresh = false;

    if (!cachedUserInfo || (now - cachedUserInfo.lastUpdated > config.TIMINGS.userCacheDuration)) {
        needsAPIRefresh = true;
    }

    let apiUserInfo = null;
    if (needsAPIRefresh) {
        apiUserInfo = await getUserInfo(userId);
        if (apiUserInfo) {
            cachedUserInfo = {
                // id: userId
                username: apiUserInfo.username,
                avatarUrl: apiUserInfo.avatarUrl,
                lastUpdated: now,
            };
            usersCache[userId] = cachedUserInfo;
        } else {
            if (cachedUserInfo) {
                cachedUserInfo.lastUpdated = now;
            } else {
                cachedUserInfo = {
                    username: 'Unknown',
                    avatarUrl: null,
                    lastUpdated: now,
                };
                usersCache[userId] = cachedUserInfo;
            }
        }
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });

    return {
        id: userId,
        username: cachedUserInfo.username,
        avatarUrl: cachedUserInfo.avatarUrl,
        lastUpdated: cachedUserInfo.lastUpdated,
        score: dbUser ? dbUser.repPoint : 0,
        banReason: dbUser && dbUser.banned ? dbUser.banMessage : null,
        bondLvl: dbUser ? dbUser.bondLvl : 0,
        totalMsgCount: dbUser ? dbUser.totalMsgCount : 0
    };
}

module.exports = getEntry;
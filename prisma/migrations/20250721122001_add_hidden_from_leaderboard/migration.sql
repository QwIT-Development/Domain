-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repPoint" INTEGER NOT NULL DEFAULT 0,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banMessage" TEXT,
    "msgCount" INTEGER NOT NULL DEFAULT 0,
    "totalMsgCount" INTEGER NOT NULL DEFAULT 0,
    "bondLvl" INTEGER NOT NULL DEFAULT 0,
    "muteCount" INTEGER NOT NULL DEFAULT 0,
    "lastInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decayed" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFromLeaderboard" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("banMessage", "banned", "bondLvl", "decayed", "id", "lastInteraction", "msgCount", "muteCount", "repPoint", "totalMsgCount") SELECT "banMessage", "banned", "bondLvl", "decayed", "id", "lastInteraction", "msgCount", "muteCount", "repPoint", "totalMsgCount" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

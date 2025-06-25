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
    "muteCount" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("banMessage", "banned", "bondLvl", "id", "msgCount", "repPoint", "totalMsgCount") SELECT "banMessage", "banned", "bondLvl", "id", "msgCount", "repPoint", "totalMsgCount" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

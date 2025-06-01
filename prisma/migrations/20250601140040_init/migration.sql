-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repPoint" INTEGER NOT NULL DEFAULT 0,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banMessage" TEXT,
    "msgCount" INTEGER NOT NULL DEFAULT 0,
    "totalMsgCount" INTEGER NOT NULL DEFAULT 0,
    "bondLvl" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repPoint" INTEGER NOT NULL DEFAULT 0,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banMessage" TEXT
);

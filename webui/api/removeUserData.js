const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const usersCache = state.usersCache;
const getEntry = require("../func/getEntry");
const { loadConfig } = require("../../initializers/configuration");
const config = loadConfig();

const removeUserData = async (req) => {
  if (
    config.DISABLE_DATA_REMOVAL === true ||
    config.DISABLE_DATA_REMOVAL === "true"
  ) {
    return new Response(
      JSON.stringify({
        error: "Data removal feature is disabled for security",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  let userId, shouldBan, banReason;

  try {
    const body = await req.json();
    userId = body.userId;
    shouldBan = body.shouldBan || false;
    banReason = body.banReason;
  } catch (e) {
    console.error(`Error parsing JSON in removeUserData request: ${e.message}`);
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Invalid request, missing userId" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (shouldBan && !banReason) {
    return new Response(
      JSON.stringify({
        error: "Ban reason is required when shouldBan is true",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { id: userId } });

      if (!existingUser) {
        throw new Error("User not found in database");
      }

      if (shouldBan) {
        await tx.user.update({
          where: { id: userId },
          data: {
            banned: true,
            banMessage: banReason,
            repPoint: 0,
            msgCount: 0,
            totalMsgCount: 0,
            bondLvl: 0,
            muteCount: 0,
            hiddenFromLeaderboard: true,
            decayed: true,
          },
        });
      } else {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    if (usersCache[userId]) {
      delete usersCache[userId];
    }

    if (shouldBan) {
      await getEntry(userId);
    }

    console.warn(
      `DATA REMOVAL SUCCESS: User ${userId} (${shouldBan ? "BANNED" : "DATA ONLY"}), Reason: ${banReason || "N/A"}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: shouldBan
          ? "User banned successfully (memories and history preserved)"
          : "User record removed successfully (memories and history preserved)",
        banned: shouldBan,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`Error removing user data for ${userId}:`, error);

    console.warn(
      `DATA REMOVAL ATTEMPT: User ${userId}, Ban: ${shouldBan}, Reason: ${banReason || "N/A"}, Error: ${error.message}`,
    );

    if (error.message === "User not found in database") {
      return new Response(
        JSON.stringify({ error: "User not found in database" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Failed to remove user data",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

module.exports = removeUserData;

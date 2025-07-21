const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const usersCache = state.usersCache;

const toggleLeaderboardVisibility = async (req) => {
  let id, hidden;
  try {
    const body = await req.json();
    id = body.id;
    hidden = body.hidden;
  } catch (e) {
    console.error(
      `Error parsing JSON in toggleLeaderboardVisibility request: ${e.message}`,
    );
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!id || typeof hidden !== "boolean") {
    return new Response(
      JSON.stringify({
        error: "Invalid request, missing id or invalid hidden value",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.user.update({
      where: { id },
      data: { hiddenFromLeaderboard: hidden },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${hidden ? "hidden from" : "shown on"} leaderboard`,
        userId: id,
        hiddenFromLeaderboard: hidden,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      `Error updating user leaderboard visibility: ${error.message}`,
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

module.exports = toggleLeaderboardVisibility;

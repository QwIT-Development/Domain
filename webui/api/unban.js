const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const state = require("../../initializers/state");
const usersCache = state.usersCache;

const unban = async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (user?.banned) {
    await prisma.user.update({
      where: { id },
      data: { banned: false, banMessage: null },
    });
    if (usersCache[id]) {
      delete usersCache[id];
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response(
      JSON.stringify({ error: "User not found or not banned" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }
};

module.exports = unban;

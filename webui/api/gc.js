const getCurrentStats = require("../func/getCurrentStats");

const gc = async () => {
  const before = await getCurrentStats();
  const beforeUsed = before.ram.used;
  const beforeTotal = before.ram.total;

  let gcPerformed = false;
  if (typeof Bun !== "undefined" && Bun.gc) {
    Bun.gc(true);
    gcPerformed = true;
  } else if (typeof global !== "undefined" && global.gc) {
    global.gc();
    gcPerformed = true;
  } else {
    return new Response(
      JSON.stringify({ error: "Garbage collection is unsupported" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const after = await getCurrentStats();
  const diffUsed = after.ram.used - beforeUsed;
  const diffTotal = after.ram.total - beforeTotal;

  return new Response(
    JSON.stringify({
      usedDiff: (diffUsed / 1024 / 1024).toFixed(2),
      totalDiff: (diffTotal / 1024 / 1024).toFixed(2),
      gcPerformed: gcPerformed,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};

module.exports = gc;

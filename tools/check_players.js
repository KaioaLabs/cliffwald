const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(
      "SELECT User.username, Player.x, Player.y FROM Player JOIN User ON Player.userId = User.id"
    );
    console.log("Database Players:", result);
  } catch (e) {
    console.error("Query failed:", e.message);
  }
}

main().finally(() => prisma.$disconnect());

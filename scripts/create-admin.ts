import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`ADMIN_BOOTSTRAP_MISSING ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const name = requiredEnv("ADMIN_NAME");
  const password = requiredEnv("ADMIN_PASSWORD");
  if (password.length < 12) {
    console.error("ADMIN_BOOTSTRAP_WEAK_PASSWORD");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error("ADMIN_BOOTSTRAP_EXISTS");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN", active: true },
  });
  console.info("ADMIN_BOOTSTRAP_OK", email);
}

main()
  .catch((error) => {
    console.error("ADMIN_BOOTSTRAP_FAILED", error instanceof Error ? error.message : "error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

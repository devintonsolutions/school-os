import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database"; // Adjust to your Prisma instance

async function main() {
  const email = process.env.ADMIN_EMAIL!; // use this env variable to create test admin account TEST_ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!; // use this env variable to create test admin account TEST_ADMIN_PASSWORD!;

  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log("Admin created:", admin);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
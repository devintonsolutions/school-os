
import "dotenv/config";

import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database.js";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not defined in .env");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not defined in .env");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },

    update: {
      // Keep existing admin data unchanged
    },

    create: {
      firstName: "System",
      lastName: "Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

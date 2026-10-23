import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database"; // Adjust to your Prisma instance

async function main() {
    const email = process.env.TEST_TEACHER_EMAIL!;
    const password = process.env.TEST_TEACHER_PASSWORD!;

    // Check whether the account already exists.
    const existingUser = await prisma.user.findUnique({
    where: { email },
    });

    if (existingUser) {
    console.log("Test teacher already exists.");
    return;
    }

    // Hash the password before storing it.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the teacher.
    const teacher = await prisma.user.create({
    data: {
        email,
        passwordHash,
        firstName: "Test",
        lastName: "Teacher",
        role: "TEACHER",
        emailVerifiedAt: new Date(),
    },
    select: {
        id: true,
        email: true,
        role: true,
    },
    });

    console.log("Test teacher created:", teacher);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
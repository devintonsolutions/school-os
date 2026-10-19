import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database";

async function main() {
  console.log("🌱 Seeding SchoolOS database...\n");

  const saltRounds = 12;

  // 1. Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@schoolos.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const adminHash = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      firstName: "System",
      lastName: "Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`👑 Admin Account:   ${admin.email} (Password: ${adminPassword})`);

  // 2. Seed Teacher
  const teacherEmail = "teacher@schoolos.com";
  const teacherPassword = "Teacher123!";
  const teacherHash = await bcrypt.hash(teacherPassword, saltRounds);

  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { role: "TEACHER" },
    create: {
      firstName: "Professor",
      lastName: "Smith",
      email: teacherEmail,
      passwordHash: teacherHash,
      role: "TEACHER",
      bio: "Computer Science Faculty Lead",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`👨‍🏫 Teacher Account: ${teacher.email} (Password: ${teacherPassword})`);

  // 3. Seed Student
  const studentEmail = "student@schoolos.com";
  const studentPassword = "Student123!";
  const studentHash = await bcrypt.hash(studentPassword, saltRounds);

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { role: "STUDENT" },
    create: {
      firstName: "Alex",
      lastName: "Doe",
      email: studentEmail,
      passwordHash: studentHash,
      role: "STUDENT",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`🎓 Student Account: ${student.email} (Password: ${studentPassword})`);

  // 4. Seed Category & Course
  const category = await prisma.category.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: {
      name: "Computer Science",
      description: "Algorithms, Software Engineering, and Computer Systems",
    },
  });

  const course = await prisma.course.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { teacherId: teacher.id },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Introduction to Algorithms & Data Structures",
      description: "Core algorithms, tree traversals, and algorithmic complexity.",
      teacherId: teacher.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });
  console.log(`\n📚 Demo Course Created:`);
  console.log(`   Title:    ${course.title}`);
  console.log(`   CourseId: ${course.id}`);

  // 5. Enroll Student in Course
  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: course.id,
      status: "ACTIVE",
    },
  });
  console.log(`   Enrolled: ${student.email} in demo course.`);

  console.log("\n✅ Database seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

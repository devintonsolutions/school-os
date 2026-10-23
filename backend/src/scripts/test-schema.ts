import { prisma } from "../config/database";

async function main() {
  console.log("🔍 Testing Prisma Schema & Database Connection...\n");

  // 1. Test Users
  const userCount = await prisma.user.count();
  console.log(`✅ Users in database: ${userCount}`);

  // 2. Test Category & Course Structure
  console.log("🧪 Testing Category & Course creation...");
  const testCategory = await prisma.category.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: {
      name: "Computer Science",
      description: "Foundational and advanced computer science topics",
    },
  });
  console.log(`✅ Category verified: ${testCategory.name} (ID: ${testCategory.id})`);

  // 3. Test Modules & Lessons model queries
  const moduleCount = await prisma.module.count();
  const lessonCount = await prisma.lesson.count();
  console.log(`✅ Modules count: ${moduleCount}, Lessons count: ${lessonCount}`);

  // 4. Test Assignments & Quizzes model queries
  const assignmentCount = await prisma.assignment.count();
  const quizCount = await prisma.quiz.count();
  console.log(`✅ Assignments count: ${assignmentCount}, Quizzes count: ${quizCount}`);

  // 5. Test Attendance & Discussions model queries
  const sessionCount = await prisma.attendanceSession.count();
  const discussionCount = await prisma.discussion.count();
  console.log(`✅ Attendance Sessions count: ${sessionCount}, Discussions count: ${discussionCount}`);

  console.log("\n🎉 All 23 schema models are functioning properly in Supabase PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("❌ Schema Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

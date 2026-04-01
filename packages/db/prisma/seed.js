const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'adelstrategics@gmail.com' },
    update: { passwordHash: '12345678', role: 'ADMIN', isActive: true, name: 'Railway Admin' },
    create: {
      email: 'adelstrategics@gmail.com',
      passwordHash: '12345678',
      role: 'ADMIN',
      isActive: true,
      name: 'Railway Admin',
    },
  });

  const internship = await prisma.internship.create({
    data: {
      title: 'Sample Vacancy',
      description: 'Seeded internship/vacancy for dashboard metrics.',
      status: 'PUBLISHED',
      vacancy: 10,
      totalVacancy: 10,
      availableVacancy: 10,
      remainingVacancy: 10,
      filledVacancy: 0,
    },
  });

  const student = await prisma.student.upsert({
    where: { email: 'student.seed@example.com' },
    update: { name: 'Seed Student', password: '12345678', isActive: true },
    create: {
      name: 'Seed Student',
      email: 'student.seed@example.com',
      password: '12345678',
      isActive: true,
    },
  });

  await prisma.internshipApplication.create({
    data: {
      internshipId: internship.id,
      studentId: student.id,
      status: 'pending',
    },
  });

  console.log('Seed complete:', { admin: admin.email, internship: internship.id, student: student.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

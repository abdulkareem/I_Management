const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'adelstrategics@gmail.com' },
    update: { password: '12345678', role: 'SUPER_ADMIN', isActive: true, name: 'Platform Super Admin' },
    create: {
      email: 'adelstrategics@gmail.com',
      password: '12345678',
      role: 'SUPER_ADMIN',
      isActive: true,
      name: 'Platform Super Admin',
    },
  });

  const college = await prisma.college.upsert({
    where: { code: 'EMEA' },
    update: { name: 'EMEA College', status: 'approved', isActive: true },
    create: { name: 'EMEA College', code: 'EMEA', status: 'approved', isActive: true },
  });

  const department = await prisma.department.upsert({
    where: { collegeId_name: { collegeId: college.id, name: 'Computer Science' } },
    update: { isActive: true },
    create: { collegeId: college.id, name: 'Computer Science', code: 'CSE', isActive: true },
  });

  const program = await prisma.program.upsert({
    where: { departmentId_name: { departmentId: department.id, name: 'B.Tech CSE' } },
    update: {},
    create: { departmentId: department.id, name: 'B.Tech CSE' },
  });

  const student = await prisma.student.upsert({
    where: { email: 'student.seed@internsuite.test' },
    update: { studentName: 'Seed Student', password: '12345678', isActive: true, collegeId: college.id, departmentId: department.id, programId: program.id },
    create: {
      studentName: 'Seed Student',
      email: 'student.seed@internsuite.test',
      password: '12345678',
      isActive: true,
      collegeId: college.id,
      departmentId: department.id,
      programId: program.id,
    },
  });

  await prisma.vacancy.upsert({
    where: { id: 'seed-vacancy-1' },
    update: { title: 'Software Engineering Intern', capacity: 25 },
    create: { id: 'seed-vacancy-1', title: 'Software Engineering Intern', capacity: 25 },
  });

  console.log('Seed complete', {
    adminId: admin.id,
    collegeId: college.id,
    departmentId: department.id,
    programId: program.id,
    studentId: student.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

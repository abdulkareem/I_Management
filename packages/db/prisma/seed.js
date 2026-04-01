require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
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

  const existingCollege = await prisma.college.findFirst({ where: { name: 'EMEA College' } });
  if (!existingCollege) {
    await prisma.college.create({ data: { name: 'EMEA College' } });
  }

  await prisma.student.upsert({
    where: { email: 'student.seed@internsuite.test' },
    update: { name: 'Seed Student', password: '12345678', isActive: true },
    create: {
      name: 'Seed Student',
      email: 'student.seed@internsuite.test',
      password: '12345678',
      isActive: true,
    },
  });

  console.log('Seed complete: super admin + EMEA College + Seed Student');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

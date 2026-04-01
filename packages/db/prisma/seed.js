const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'adelstrategics@gmail.com' },
    update: { password: '12345678', role: 'admin', isActive: true, name: 'Platform Admin' },
    create: {
      email: 'adelstrategics@gmail.com',
      password: '12345678',
      role: 'admin',
      isActive: true,
      name: 'Platform Admin',
    },
  });

  const existingCollege = await prisma.college.findFirst({ where: { name: 'EMEA College' } });
  if (!existingCollege) {
    await prisma.college.create({ data: { name: 'EMEA College' } });
  }

  console.log('Seed complete: admin + EMEA College');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

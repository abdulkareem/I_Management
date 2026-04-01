const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const roleMap = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COLLEGE: 'COLLEGE_COORDINATOR',
  COORDINATOR: 'COLLEGE_COORDINATOR',
  COLLEGE_ADMIN: 'COLLEGE_COORDINATOR',
  COLLEGE_COORDINATOR: 'COLLEGE_COORDINATOR',
  DEPARTMENT: 'DEPARTMENT_COORDINATOR',
  DEPARTMENT_COORDINATOR: 'DEPARTMENT_COORDINATOR',
  INDUSTRY: 'IPO',
  IPO: 'IPO',
  STUDENT: 'STUDENT',
  EXTERNAL_STUDENT: 'STUDENT',
};

function toCanonicalRole(rawRole) {
  const normalized = String(rawRole || '').trim().toUpperCase();
  return roleMap[normalized] || 'STUDENT';
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  let updated = 0;

  for (const user of users) {
    const mappedRole = toCanonicalRole(user.role);
    if (user.role !== mappedRole) {
      await prisma.user.update({ where: { id: user.id }, data: { role: mappedRole } });
      updated += 1;
    }
  }

  console.log(`Processed ${users.length} users, updated ${updated} role values.`);
}

main()
  .catch((error) => {
    console.error('Role migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

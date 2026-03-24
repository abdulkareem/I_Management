import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { PrismaClient, Role, CollegeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.application.deleteMany();
  await prisma.internship.deleteMany();
  await prisma.industryInterest.deleteMany();
  await prisma.internshipIdea.deleteMany();
  await prisma.student.deleteMany();
  await prisma.department.deleteMany();
  await prisma.coordinator.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.college.deleteMany();
  await prisma.user.deleteMany();

  const superAdminPassword = crypto.randomBytes(8).toString('base64url');

  const admin = await prisma.user.create({
    data: {
      name: 'Platform Super Admin',
      email: 'abdulkareem.t@gmail.com',
      password: await bcrypt.hash(superAdminPassword, 10),
      role: Role.SUPER_ADMIN,
    },
  });

  const collegeUser = await prisma.user.create({
    data: {
      name: 'Sample College Admin',
      email: 'college@internsuite.com',
      password: await bcrypt.hash('Password@123', 10),
      role: Role.COLLEGE_ADMIN,
    },
  });

  const college = await prisma.college.create({
    data: {
      name: 'IIT Demo College',
      email: 'info@iit-demo.edu',
      phone: '9999999999',
      address: 'Demo Address',
      university: 'Demo University',
      status: CollegeStatus.APPROVED,
      createdById: collegeUser.id,
    },
  });

  console.log({ superAdmin: admin.email, generatedPassword: superAdminPassword, college: college.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

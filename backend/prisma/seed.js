import bcrypt from 'bcryptjs';
import { PrismaClient, Role, ApplicationStatus, AttendanceStatus } from '@prisma/client';

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

  const hashed = await bcrypt.hash('Password@123', 10);

  const admin = await prisma.user.create({ data: { name: 'Platform Admin', email: 'admin@internsuite.com', password: hashed, role: Role.ADMIN } });
  const collegeUser = await prisma.user.create({ data: { name: 'IIT College Admin', email: 'college@internsuite.com', password: hashed, role: Role.COLLEGE } });
  const coordinatorUser = await prisma.user.create({ data: { name: 'CSE Coordinator', email: 'coordinator@internsuite.com', password: hashed, role: Role.COORDINATOR } });
  const industryUser = await prisma.user.create({ data: { name: 'Industry Owner', email: 'industry@internsuite.com', password: hashed, role: Role.INDUSTRY } });
  const studentUser = await prisma.user.create({ data: { name: 'Student One', email: 'student@internsuite.com', password: hashed, role: Role.STUDENT } });

  const coordinator = await prisma.coordinator.create({ data: { userId: coordinatorUser.id, phone: '9999999999' } });

  const college = await prisma.college.create({ data: { name: 'IIT Demo College', createdById: collegeUser.id } });
  const department = await prisma.department.create({ data: { name: 'Computer Science', collegeId: college.id, coordinatorId: coordinator.id } });

  const student = await prisma.student.create({ data: { userId: studentUser.id, collegeId: college.id, departmentId: department.id } });

  const industry = await prisma.industry.create({
    data: { name: 'TechNova Industries', registrationDetails: 'Reg No TN-9988', userId: industryUser.id },
  });

  const idea = await prisma.internshipIdea.create({
    data: {
      title: 'AI Campus Assistant',
      description: 'Build an AI assistant for campus services.',
      outcomes: 'Production-ready assistant with analytics',
      departmentId: department.id,
      createdById: coordinator.id,
    },
  });

  await prisma.industryInterest.create({ data: { industryId: industry.id, departmentId: department.id } });

  const internship = await prisma.internship.create({
    data: {
      industryId: industry.id,
      collegeId: college.id,
      departmentId: department.id,
      ideaId: idea.id,
    },
  });

  await prisma.application.create({ data: { studentId: student.id, internshipId: internship.id, status: ApplicationStatus.APPROVED } });

  await prisma.attendance.create({
    data: {
      studentId: student.id,
      internshipId: internship.id,
      date: new Date(),
      status: AttendanceStatus.PRESENT,
    },
  });

  console.log({ admin: admin.email, college: college.name, industry: industry.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

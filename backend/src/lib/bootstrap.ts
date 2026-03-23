import { MouStatus, Role, prisma } from '@prism/database';
import { generateMouPdf } from './documents.js';
import { hashPassword } from './security.js';

export async function bootstrapDemoData() {
  const existingCollege = await prisma.college.findFirst({ where: { name: 'Northstar College of Engineering' } });
  if (existingCollege) {
    return;
  }

  const coordinator = await prisma.user.create({
    data: {
      email: 'coordinator@northstar.edu',
      password: hashPassword('Demo12345'),
      name: 'Asha Coordinator',
      role: Role.COLLEGE_COORDINATOR,
      college: {
        create: {
          name: 'Northstar College of Engineering',
          address: 'Innovation Avenue, Kochi, Kerala',
          emblem: 'https://placehold.co/128x128/png?text=NCE',
          departments: {
            create: [{ name: 'Computer Science' }, { name: 'Mechanical Engineering' }],
          },
        },
      },
    },
    include: { college: { include: { departments: true } } },
  });

  const industryUser = await prisma.user.create({
    data: {
      email: 'hello@skillforge.ai',
      password: hashPassword('Demo12345'),
      name: 'Riya Industry',
      role: Role.INDUSTRY,
      industry: {
        create: {
          name: 'SkillForge Labs',
          description: 'AI product studio building student-friendly internships.',
          emblem: 'https://placehold.co/128x128/png?text=SF',
        },
      },
    },
    include: { industry: true },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: 'student@northstar.edu',
      password: hashPassword('Demo12345'),
      name: 'Neha Student',
      role: Role.STUDENT,
      student: {
        create: {
          collegeId: coordinator.college!.id,
          departmentId: coordinator.college!.departments[0]?.id,
          universityRegNo: 'NCE-2026-CS-001',
          dob: new Date('2004-05-17'),
          whatsapp: '+919876543210',
          address: 'Kaloor, Kochi',
        },
      },
    },
    include: { student: true },
  });

  const pdfUrl = await generateMouPdf({
    collegeName: coordinator.college!.name,
    industryName: industryUser.industry!.name,
    coordinatorName: coordinator.name,
  });

  await prisma.moU.create({
    data: {
      collegeId: coordinator.college!.id,
      industryId: industryUser.industry!.id,
      status: MouStatus.ACCEPTED,
      signedAt: new Date(),
      pdfUrl,
    },
  });

  const opportunity = await prisma.internshipOpportunity.create({
    data: {
      industryId: industryUser.industry!.id,
      title: 'Frontend PWA Intern',
      description: 'Build mobile-first student experiences, offline flows, and polished dashboards.',
    },
  });

  await prisma.application.create({
    data: {
      studentId: studentUser.student!.id,
      opportunityId: opportunity.id,
    },
  });
}

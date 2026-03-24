import { Role } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { studentRepository } from '../repositories/student.repository.js';

export const studentService = {
  async register(payload: { name: string; email: string; password: string; collegeId: string; departmentId: string }) {
    const user = await authRepository.createUser({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: Role.STUDENT,
    });

    return studentRepository.create({ userId: user.id, collegeId: payload.collegeId, departmentId: payload.departmentId });
  },
};

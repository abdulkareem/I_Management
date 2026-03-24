import { departmentRepository } from '../repositories/department.repository.js';

export const departmentService = {
  bulkCreate: departmentRepository.bulkCreate,
};

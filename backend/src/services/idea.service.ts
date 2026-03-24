import { ideaRepository } from '../repositories/idea.repository.js';

export const ideaService = {
  createMany: ideaRepository.createMany,
  listByDepartment: ideaRepository.listByDepartment,
};

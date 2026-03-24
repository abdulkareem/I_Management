import { coordinatorRepository } from '../repositories/coordinator.repository.js';

export const coordinatorService = {
  create: coordinatorRepository.create,
  findByUserId: coordinatorRepository.findByUserId,
};

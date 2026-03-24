import { internshipRepository } from '../repositories/internship.repository.js';

export const internshipService = {
  create: internshipRepository.create,
};

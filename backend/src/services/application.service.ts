import { ApplicationStatus } from '@prisma/client';
import { applicationRepository } from '../repositories/application.repository.js';

export const applicationService = {
  apply: applicationRepository.create,
  updateStatus: (id: string, status: ApplicationStatus) => applicationRepository.updateStatus(id, status),
};

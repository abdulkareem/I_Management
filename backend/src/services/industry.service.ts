import { Role } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { industryRepository } from '../repositories/industry.repository.js';

export const industryService = {
  async create(payload: {
    name: string;
    registrationDetails: string;
    emblemUrl?: string;
    emblemBinary?: string;
    owner: { name: string; email: string; password: string };
  }) {
    const user = await authRepository.createUser({ ...payload.owner, role: Role.INDUSTRY });
    return industryRepository.create({
      name: payload.name,
      registrationDetails: payload.registrationDetails,
      emblemUrl: payload.emblemUrl,
      emblemBinary: payload.emblemBinary ? Uint8Array.from(Buffer.from(payload.emblemBinary, 'base64')) : undefined,
      userId: user.id,
    });
  },

  findByUserId: industryRepository.findByUserId,
};

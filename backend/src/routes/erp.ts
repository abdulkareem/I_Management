import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { apiBlueprint, documentBlueprints, identityBlueprint, lifecycleWorkflow, uploadBlueprints } from '../lib/blueprints.js';
import { createUploadTarget, getUploadPolicy } from '../lib/storage.js';
import { requireAuth } from '../lib/security.js';

export const erpRoutes: FastifyPluginAsync = async (app) => {
  app.get('/erp/identity', async () => identityBlueprint);

  app.get('/erp/workflow', async () => lifecycleWorkflow);

  app.get('/erp/documents', async () => ({
    templates: documentBlueprints,
    generationPipeline: [
      'Validate role permissions and tenant ownership.',
      'Resolve logos and supporting assets from FileStorage.',
      'Inject internship, student, attendance, or evaluation data into the correct template.',
      'Persist the generated PDF in R2 and store the file URL in GeneratedDocument.',
    ],
  }));

  app.get('/erp/uploads', async () => ({
    provider: 'cloudflare-r2',
    policies: uploadBlueprints,
  }));

  app.get('/erp/security', async () => ({
    jwt: 'HS256 signed JWTs with per-session revocation records.',
    tenantIsolation: [
      'Every operational entity stores tenantId and collegeId where applicable.',
      'Role middleware validates route access before handler execution.',
      'R2 object keys are namespaced by tenant and entity IDs to prevent leakage across colleges.',
    ],
    validation: [
      'Zod schemas validate all auth, workflow, and upload payloads.',
      'Student passport photos are limited to 200 KB.',
      'Passwords require at least 8 characters and are hashed with bcrypt.',
    ],
  }));

  app.get('/erp/api-map', async () => apiBlueprint);

  app.post(
    '/files/presign',
    {
      preHandler: requireAuth({ roles: ['college', 'student', 'industry', 'super_admin'] }),
    },
    async (request) => {
      const payload = z
        .object({
          kind: z.enum([
            'college-logo',
            'industry-logo',
            'student-passport-photo',
            'student-resume',
            'generated-pdf',
          ]),
          fileName: z.string().min(1),
          entityId: z.string().min(1),
          contentType: z.string().optional(),
        })
        .parse(request.body);

      const target = await createUploadTarget({
        tenantId: request.user?.tenantId ?? 'tenant-demo',
        entityId: payload.entityId,
        kind: payload.kind,
        fileName: payload.fileName,
        contentType: payload.contentType,
      });

      return {
        policy: getUploadPolicy(payload.kind),
        target,
      };
    },
  );
};

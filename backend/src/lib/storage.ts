import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup as lookupMime } from 'mime-types';
import type { UploadPolicy, UploadKind } from '@prism/types';

const uploadPolicies: Record<UploadKind, UploadPolicy> = {
  'college-logo': {
    kind: 'college-logo',
    storageProvider: 'cloudflare-r2',
    maxBytes: 300_000,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    visibility: 'shared',
    pathTemplate: 'tenants/{tenantId}/college/{entityId}/logo/{fileName}',
  },
  'industry-logo': {
    kind: 'industry-logo',
    storageProvider: 'cloudflare-r2',
    maxBytes: 300_000,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    visibility: 'shared',
    pathTemplate: 'tenants/{tenantId}/industry/{entityId}/logo/{fileName}',
  },
  'student-passport-photo': {
    kind: 'student-passport-photo',
    storageProvider: 'cloudflare-r2',
    maxBytes: 200_000,
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    visibility: 'private',
    pathTemplate: 'tenants/{tenantId}/student/{entityId}/passport/{fileName}',
  },
  'student-resume': {
    kind: 'student-resume',
    storageProvider: 'cloudflare-r2',
    maxBytes: 2_000_000,
    allowedMimeTypes: ['application/pdf'],
    visibility: 'private',
    pathTemplate: 'tenants/{tenantId}/student/{entityId}/resume/{fileName}',
  },
  'generated-pdf': {
    kind: 'generated-pdf',
    storageProvider: 'cloudflare-r2',
    maxBytes: 5_000_000,
    allowedMimeTypes: ['application/pdf'],
    visibility: 'tenant',
    pathTemplate: 'tenants/{tenantId}/documents/{entityId}/{fileName}',
  },
};

function getStorageClient() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getUploadPolicy(kind: UploadKind) {
  return uploadPolicies[kind];
}

export async function createUploadTarget(input: {
  tenantId: string;
  entityId: string;
  kind: UploadKind;
  fileName: string;
  contentType?: string;
}) {
  const policy = uploadPolicies[input.kind];
  const client = getStorageClient();
  const bucket = process.env.R2_BUCKET ?? 'internsuite-assets';
  const inferredMimeType = input.contentType ?? lookupMime(input.fileName) ?? 'application/octet-stream';

  if (!policy.allowedMimeTypes.includes(inferredMimeType)) {
    throw new Error(`Unsupported content type ${inferredMimeType} for ${input.kind}.`);
  }

  const objectKey = policy.pathTemplate
    .replace('{tenantId}', input.tenantId)
    .replace('{entityId}', input.entityId)
    .replace('{fileName}', `${randomUUID()}-${input.fileName}`);

  if (!client) {
    return {
      bucket,
      objectKey,
      simulated: true,
      uploadUrl: `https://example.invalid/${bucket}/${objectKey}`,
      policy,
    };
  }

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: inferredMimeType,
    }),
    { expiresIn: 60 * 10 },
  );

  return {
    bucket,
    objectKey,
    simulated: false,
    uploadUrl,
    policy,
  };
}

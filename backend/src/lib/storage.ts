import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const documentsDir = path.resolve(process.cwd(), 'generated-documents');

export async function storeBinaryAsset(input: {
  fileName: string;
  buffer: Buffer;
  contentType: string;
}) {
  await mkdir(documentsDir, { recursive: true });
  const target = path.join(documentsDir, input.fileName);
  await writeFile(target, input.buffer);

  const publicBaseUrl = process.env.PUBLIC_ASSET_BASE_URL ?? `${process.env.APP_URL ?? 'http://localhost:4000'}/assets`;
  return `${publicBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(input.fileName)}`;
}

export function resolveStoredAsset(fileName: string) {
  return path.join(documentsDir, fileName);
}

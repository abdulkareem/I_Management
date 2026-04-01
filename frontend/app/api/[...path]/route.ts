import { handleLegacyApi } from '@/lib/server/legacy-worker';
import { getWorkerEnv } from '@/lib/server/db';


async function delegate(request: Request) {
  const env = getWorkerEnv();
  return handleLegacyApi(request, env);
}

export async function GET(request: Request) { return delegate(request); }
export async function POST(request: Request) { return delegate(request); }
export async function PUT(request: Request) { return delegate(request); }
export async function PATCH(request: Request) { return delegate(request); }
export async function DELETE(request: Request) { return delegate(request); }
export async function OPTIONS(request: Request) { return delegate(request); }

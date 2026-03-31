import { GET as CGET, POST as CPOST, PUT as CPUT, PATCH as CPATCH, DELETE as CDELETE, OPTIONS as COPTIONS } from '@/app/api/[...path]/route';

export const runtime = 'edge';
export async function GET(request: Request) { return CGET(request); }
export async function POST(request: Request) { return CPOST(request); }
export async function PUT(request: Request) { return CPUT(request); }
export async function PATCH(request: Request) { return CPATCH(request); }
export async function DELETE(request: Request) { return CDELETE(request); }
export async function OPTIONS(request: Request) { return COPTIONS(request); }

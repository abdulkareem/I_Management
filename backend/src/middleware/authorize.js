const ROLE_ALIASES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPERADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COLLEGE: 'COLLEGE_COORDINATOR',
  COLLEGE_COORDINATOR: 'COLLEGE_COORDINATOR',
  COORDINATOR: 'COLLEGE_COORDINATOR',
  DEPARTMENT: 'DEPARTMENT_COORDINATOR',
  DEPARTMENT_COORDINATOR: 'DEPARTMENT_COORDINATOR',
  IPO: 'IPO',
  INDUSTRY: 'IPO',
  STUDENT: 'STUDENT',
  EXTERNAL_STUDENT: 'STUDENT',
};

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['/api/admin', '/api/college', '/api/department', '/api/ipo'],
  COLLEGE_COORDINATOR: ['/api/college'],
  DEPARTMENT_COORDINATOR: ['/api/department'],
  IPO: ['/api/ipo'],
  STUDENT: ['/api/student'],
};

const ROUTE_ROLE_MATRIX = [
  { prefix: '/api/admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/api/college', roles: ['SUPER_ADMIN', 'ADMIN', 'COLLEGE_COORDINATOR'] },
  { prefix: '/api/department', roles: ['SUPER_ADMIN', 'ADMIN', 'COLLEGE_COORDINATOR', 'DEPARTMENT_COORDINATOR'] },
  { prefix: '/api/ipo', roles: ['SUPER_ADMIN', 'ADMIN', 'IPO'] },
  { prefix: '/api/student', roles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'] },
];

function normalizeRole(role) {
  if (!role) return null;
  return ROLE_ALIASES[String(role).trim().toUpperCase()] ?? null;
}

function parseRoleFromToken(token) {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return normalizeRole(payload?.role);
    }
  } catch {
    // no-op: fallback to legacy token parsing
  }

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return normalizeRole(payload?.role);
  } catch {
    return null;
  }
}

export function authorizeRequest(request) {
  const pathname = new URL(request.url).pathname;
  const policy = ROUTE_ROLE_MATRIX.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!policy) return null;

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const role = parseRoleFromToken(token);

  if (!role || !policy.roles.includes(role)) {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden: insufficient role permissions.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}

export type CanonicalRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COLLEGE_COORDINATOR'
  | 'DEPARTMENT_COORDINATOR'
  | 'IPO'
  | 'STUDENT';

const roleMap: Record<string, CanonicalRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COLLEGE: 'COLLEGE_COORDINATOR',
  COORDINATOR: 'COLLEGE_COORDINATOR',
  COLLEGE_ADMIN: 'COLLEGE_COORDINATOR',
  COLLEGE_COORDINATOR: 'COLLEGE_COORDINATOR',
  DEPARTMENT: 'DEPARTMENT_COORDINATOR',
  DEPARTMENT_COORDINATOR: 'DEPARTMENT_COORDINATOR',
  INDUSTRY: 'IPO',
  IPO: 'IPO',
  STUDENT: 'STUDENT',
  EXTERNAL_STUDENT: 'STUDENT',
};

export function normalizeRole(role: string): CanonicalRole | null {
  const normalized = String(role || '').trim().toUpperCase();
  return roleMap[normalized] ?? null;
}

export function authorizeRoles(...allowedRoles: CanonicalRole[]) {
  return (req: any, res: any, next: () => void) => {
    const normalized = normalizeRole(req?.user?.role);
    if (!normalized || !allowedRoles.includes(normalized)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.user.role = normalized;
    next();
  };
}

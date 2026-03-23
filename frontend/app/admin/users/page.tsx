'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

interface UserListResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    registrationNumber: string | null;
    programme: string | null;
    year: number | null;
    semester: number | null;
    emailVerifiedAt: string | null;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListResponse['users']>([]);

  useEffect(() => {
    fetchWithSession<UserListResponse>('/users')
      .then((response) => setUsers(response.data.users))
      .catch(() => setUsers([]));
  }, []);

  return (
    <AppShell title="User management">
      {() => (
        <Card className="rounded-[30px] p-6">
          <h2 className="text-2xl font-semibold text-white">Tenant roster</h2>
          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Academic</th>
                  <th className="px-4 py-3">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/30 text-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-4">{user.role}</td>
                    <td className="px-4 py-4">{user.programme ?? '—'}</td>
                    <td className="px-4 py-4">Year {user.year ?? '—'} / Sem {user.semester ?? '—'}</td>
                    <td className="px-4 py-4">{user.emailVerifiedAt ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}

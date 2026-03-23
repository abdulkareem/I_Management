'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

interface NotificationsResponse {
  notifications: Array<{ id: string; title: string; body: string; type: string; readAt: string | null; createdAt: string }>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationsResponse['notifications']>([]);

  useEffect(() => {
    fetchWithSession<NotificationsResponse>('/notifications')
      .then((response) => setNotifications(response.data.notifications))
      .catch(() => setNotifications([]));
  }, []);

  return (
    <AppShell title="Notifications inbox">
      {() => (
        <div className="grid gap-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className="rounded-[28px] p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{notification.title}</h2>
                  <p className="mt-2 text-slate-300">{notification.body}</p>
                </div>
                <div className="text-sm uppercase tracking-[0.24em] text-cyan-300">
                  {notification.readAt ? 'Read' : 'Unread'} · {notification.type}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

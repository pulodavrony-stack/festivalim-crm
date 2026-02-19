'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTeam } from '@/components/providers/TeamProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export interface AppNotification {
  id: string;
  type: 'new_lead' | 'new_call' | 'new_message' | 'deal_won' | 'task_due' | 'new_deal';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const MAX_NOTIFICATIONS = 50;

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function buildNotification(table: string, record: Record<string, unknown>): AppNotification | null {
  const id = `${table}-${record.id}-${Date.now()}`;
  const now = new Date().toISOString();

  switch (table) {
    case 'clients':
      if (record.client_type === 'lead') {
        return {
          id,
          type: 'new_lead',
          title: 'Новый лид',
          body: (record.full_name as string) || 'Без имени',
          link: `/clients/${record.id}`,
          read: false,
          created_at: now,
        };
      }
      return null;

    case 'calls':
      return {
        id,
        type: 'new_call',
        title: 'Входящий звонок',
        body: (record.caller_number as string) || 'Неизвестный номер',
        link: `/clients`,
        read: false,
        created_at: now,
      };

    case 'messages':
      return {
        id,
        type: 'new_message',
        title: 'Новое сообщение',
        body: ((record.content as string) || '').slice(0, 60) || 'Входящее сообщение',
        link: `/messages`,
        read: false,
        created_at: now,
      };

    case 'deals':
      if (record.status === 'won') {
        return {
          id,
          type: 'deal_won',
          title: '🎉 Сделка выиграна!',
          body: `${record.amount ? Number(record.amount).toLocaleString('ru-RU') + ' ₽' : 'Сделка закрыта'}`,
          link: `/pipeline`,
          read: false,
          created_at: now,
        };
      }
      return null;

    default:
      return null;
  }
}

export function useRealtimeNotifications() {
  const { teamSchema } = useTeam();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const channelsRef = useRef<ReturnType<ReturnType<typeof makeClient>['channel']>[]>([]);
  const clientRef = useRef<ReturnType<typeof makeClient> | null>(null);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => {
      const next = [n, ...prev].slice(0, MAX_NOTIFICATIONS);
      return next;
    });

    // Browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(n.title, { body: n.body, icon: '/favicon.ico' });
    }
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!user || !teamSchema) return;

    // Request browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (!clientRef.current) {
      clientRef.current = makeClient();
    }
    const client = clientRef.current;

    const tables = ['clients', 'calls', 'messages', 'deals'] as const;

    tables.forEach(table => {
      const channel = client
        .channel(`realtime-${teamSchema}-${table}`)
        .on(
          'postgres_changes' as Parameters<typeof channel.on>[0],
          {
            event: 'INSERT',
            schema: teamSchema,
            table,
          },
          (payload: { new: Record<string, unknown> }) => {
            const notification = buildNotification(table, payload.new);
            if (notification) addNotification(notification);
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach(ch => {
        client.removeChannel(ch);
      });
      channelsRef.current = [];
    };
  }, [user, teamSchema, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, clearAll };
}

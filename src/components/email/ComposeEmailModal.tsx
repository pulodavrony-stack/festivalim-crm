'use client';

import { useState, useEffect } from 'react';
import { schemaInsert } from '@/lib/schema-api';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  toEmail: string;
  clientName?: string;
  clientId?: string;
  teamSchema?: string;
}

export default function ComposeEmailModal({
  isOpen,
  onClose,
  toEmail,
  clientName,
  clientId,
  teamSchema,
}: ComposeEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [senderInfo, setSenderInfo] = useState({ email: '', name: '' });

  useEffect(() => {
    if (isOpen && teamSchema) {
      fetch(`/api/email/send?schema=${teamSchema}`)
        .then(r => r.json())
        .then(data => {
          if (data.senderEmail) {
            setSenderInfo({ email: data.senderEmail, name: data.senderName });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, teamSchema]);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject,
          text: body,
          schema: teamSchema,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (clientId && teamSchema) {
        await schemaInsert(teamSchema, 'activities', {
          client_id: clientId,
          activity_type: 'message_outbound',
          content: `Email: "${subject}"`,
        });
      }

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setSubject('');
        setBody('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl">
          <div>
            <h3 className="text-white font-semibold text-lg">Написать письмо</h3>
            <p className="text-white/70 text-sm">{clientName || toEmail}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-lg font-semibold text-gray-900">Письмо отправлено!</p>
            <p className="text-sm text-gray-500 mt-1">{toEmail}</p>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {senderInfo.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">От</label>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                    <span>✉️</span>
                    <span>{senderInfo.name} &lt;{senderInfo.email}&gt;</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кому</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">{toEmail}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Тема письма..."
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сообщение</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Текст письма..."
                  rows={12}
                  className="w-full px-4 py-3 border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {senderInfo.email
                  ? `Отправка с ${senderInfo.email}`
                  : 'Письмо будет отправлено с корпоративной почты'
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !body.trim()}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>✉️ Отправить</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

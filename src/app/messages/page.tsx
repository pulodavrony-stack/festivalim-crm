'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';

interface Conversation {
  id: string;
  client_id: string;
  channel: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  client: {
    id: string;
    full_name: string;
    phone: string;
    client_type: string;
  };
}

interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
  manager?: {
    full_name: string;
  } | {
    full_name: string;
  }[];
}

const channelIcons: Record<string, { icon: string; color: string; name: string }> = {
  whatsapp: { icon: '💬', color: 'bg-green-500', name: 'WhatsApp' },
  telegram: { icon: '✈️', color: 'bg-blue-500', name: 'Telegram' },
  sms: { icon: '📱', color: 'bg-purple-500', name: 'SMS' },
};

const clientTypeBadge: Record<string, { label: string; color: string }> = {
  lead: { label: 'Лид', color: 'bg-blue-100 text-blue-700' },
  pk: { label: 'ПК', color: 'bg-purple-100 text-purple-700' },
  kb: { label: 'КБ', color: 'bg-green-100 text-green-700' },
};

export default function MessagesPage() {
  const supabase = useSchemaClient();
  const { teamSchema, isLoading: teamLoading } = useTeam();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'whatsapp' | 'telegram'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    // Get unique conversations from messages
    let query = supabase
      .from('messages')
      .select(`
        id,
        client_id,
        channel,
        content,
        created_at,
        client:clients(id, full_name, phone, client_type)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'whatsapp') {
      query = query.eq('channel', 'whatsapp');
    } else if (filter === 'telegram') {
      query = query.eq('channel', 'telegram');
    }

    const { data } = await query.limit(500);

    if (data) {
      // Group by client_id to get conversations
      const conversationsMap = new Map<string, Conversation>();
      
      data.forEach((msg: any) => {
        if (msg.client && !conversationsMap.has(msg.client_id)) {
          conversationsMap.set(msg.client_id, {
            id: msg.client_id,
            client_id: msg.client_id,
            channel: msg.channel,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0, // TODO: implement unread tracking
            client: msg.client,
          });
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    }
    setLoading(false);
  }, [filter]);

  const loadMessages = useCallback(async (clientId: string) => {
    setMessagesLoading(true);
    
    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        direction,
        status,
        created_at,
        manager:managers(full_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    if (!teamLoading) {
      loadConversations();
    }
  }, [loadConversations, teamLoading]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.client_id);
    }
  }, [selectedConversation, loadMessages]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    
    const { error } = await supabase.from('messages').insert({
      client_id: selectedConversation.client_id,
      channel: selectedConversation.channel,
      direction: 'outbound',
      content: newMessage,
      status: 'sent',
    });

    if (!error) {
      setNewMessage('');
      loadMessages(selectedConversation.client_id);
      loadConversations();
    } else {
      alert('Ошибка отправки: ' + error.message);
    }
    
    setSending(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + 
           ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  // Quick reply templates
  const quickReplies = [
    'Добрый день! Чем могу помочь?',
    'Спасибо за обращение! Уточните, пожалуйста...',
    'Билеты на этот спектакль ещё есть в продаже',
    'Перезвоню вам в ближайшее время',
    'Отправил вам подробную информацию',
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Сообщения</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { value: 'all', label: 'Все' },
                  { value: 'unread', label: 'Непрочитанные' },
                  { value: 'whatsapp', label: '💬 WhatsApp' },
                  { value: 'telegram', label: '✈️ Telegram' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value as typeof filter)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      filter === f.value
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Поиск диалогов..."
              className="w-full px-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>Нет диалогов</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${channelIcons[conv.channel]?.color || 'bg-gray-400'} flex items-center justify-center text-white text-lg`}>
                      {conv.client.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {conv.client.full_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{channelIcons[conv.channel]?.icon}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${clientTypeBadge[conv.client.client_type]?.color || 'bg-gray-100'}`}>
                          {clientTypeBadge[conv.client.client_type]?.label || conv.client.client_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conv.last_message}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${channelIcons[selectedConversation.channel]?.color || 'bg-gray-400'} flex items-center justify-center text-white text-lg`}>
                    {selectedConversation.client.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedConversation.client.full_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span>{selectedConversation.client.phone}</span>
                      <span>•</span>
                      <span>{channelIcons[selectedConversation.channel]?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('phone-call', { detail: { number: selectedConversation.client.phone } }))}
                    className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    title="Позвонить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <Link
                    href={`/clients/${selectedConversation.client_id}`}
                    className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Карточка клиента"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Нет сообщений</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.direction === 'outbound'
                            ? 'bg-red-500 text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`text-xs mt-1 flex items-center gap-1 ${
                          msg.direction === 'outbound' ? 'text-red-200' : 'text-gray-400'
                        }`}>
                          {formatTime(msg.created_at)}
                          {msg.direction === 'outbound' && msg.status === 'delivered' && (
                            <span>✓✓</span>
                          )}
                          {msg.direction === 'outbound' && msg.status === 'sent' && (
                            <span>✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div className="bg-white border-t px-4 py-2 flex gap-2 overflow-x-auto">
                {quickReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => setNewMessage(reply)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 whitespace-nowrap transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Введите сообщение..."
                    className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? '...' : 'Отправить'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium">Выберите диалог</p>
                <p className="text-sm">для начала общения с клиентом</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

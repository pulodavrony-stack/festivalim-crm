'use client';

import { useState, useEffect } from 'react';
import { useSchemaClient } from '@/components/providers/TeamProvider';
import ComposeEmailModal from '@/components/email/ComposeEmailModal';

interface SalesScript {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface ClientContact {
  id: string;
  client_id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
  comments: string;
}

interface SalesToolsPanelProps {
  clientId: string | null;
  clientPhone?: string;
  clientName?: string;
  clientOrg?: string;
  dealTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesToolsPanel({
  clientId,
  clientPhone,
  clientName,
  clientOrg,
  dealTitle,
  isOpen,
  onClose,
}: SalesToolsPanelProps) {
  const supabase = useSchemaClient();
  const [activeTab, setActiveTab] = useState<'scripts' | 'messaging' | 'contacts'>('scripts');

  // Scripts
  const [scripts, setScripts] = useState<SalesScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<SalesScript | null>(null);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editScript, setEditScript] = useState({ title: '', content: '', category: 'general' });

  // Messaging templates
  const [messageTemplate, setMessageTemplate] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [editContact, setEditContact] = useState({
    full_name: '', position: '', phone: '', email: '', comments: ''
  });

  // Generate personalized message from script template
  function generateMessage(scriptContent: string): string {
    const contactName = clientName || 'Уважаемый руководитель';
    const orgName = clientOrg || '';
    const firstName = contactName.split(' ').slice(-1)[0] || contactName;
    
    return scriptContent
      .replace(/\{ФИО\}/g, contactName)
      .replace(/\{Имя\}/g, firstName)
      .replace(/\{Организация\}/g, orgName)
      .replace(/\{Сделка\}/g, dealTitle || '')
      .replace(/\[ваше имя\]/g, 'менеджер')
      .replace(/\[ФИО\]/g, contactName)
      .replace(/\{Дата\}/g, new Date().toLocaleDateString('ru-RU'));
  }

  // Copy text to clipboard and show toast
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadScripts();
      if (clientId) loadContacts();
    }
  }, [isOpen, clientId]);

  async function loadScripts() {
    const { data } = await supabase
      .from('sales_scripts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data) setScripts(data);
  }

  async function loadContacts() {
    if (!clientId) return;
    const { data } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at');
    if (data) setContacts(data);
  }

  // === Scripts CRUD ===
  function startNewScript() {
    setSelectedScript(null);
    setEditScript({ title: '', content: '', category: 'general' });
    setIsEditingScript(true);
  }

  function startEditScript(script: SalesScript) {
    setSelectedScript(script);
    setEditScript({ title: script.title, content: script.content, category: script.category });
    setIsEditingScript(true);
  }

  async function saveScript() {
    if (!editScript.title.trim()) return;
    if (selectedScript) {
      await supabase.from('sales_scripts').update({
        title: editScript.title,
        content: editScript.content,
        category: editScript.category,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedScript.id);
    } else {
      await supabase.from('sales_scripts').insert({
        title: editScript.title,
        content: editScript.content,
        category: editScript.category,
      });
    }
    setIsEditingScript(false);
    setSelectedScript(null);
    loadScripts();
  }

  async function deleteScript(id: string) {
    await supabase.from('sales_scripts').update({ is_active: false }).eq('id', id);
    if (selectedScript?.id === id) setSelectedScript(null);
    loadScripts();
  }

  // === Contacts CRUD ===
  function startNewContact() {
    setEditingContactId(null);
    setEditContact({ full_name: '', position: '', phone: '', email: '', comments: '' });
    setIsAddingContact(true);
  }

  function startEditContactItem(c: ClientContact) {
    setEditingContactId(c.id);
    setEditContact({
      full_name: c.full_name || '',
      position: c.position || '',
      phone: c.phone || '',
      email: c.email || '',
      comments: c.comments || '',
    });
    setIsAddingContact(true);
  }

  async function saveContact() {
    if (!editContact.full_name.trim() || !clientId) return;
    if (editingContactId) {
      await supabase.from('client_contacts').update({
        full_name: editContact.full_name,
        position: editContact.position || null,
        phone: editContact.phone || null,
        email: editContact.email || null,
        comments: editContact.comments || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingContactId);
    } else {
      await supabase.from('client_contacts').insert({
        client_id: clientId,
        full_name: editContact.full_name,
        position: editContact.position || null,
        phone: editContact.phone || null,
        email: editContact.email || null,
        comments: editContact.comments || null,
      });
    }
    setIsAddingContact(false);
    setEditingContactId(null);
    setEditContact({ full_name: '', position: '', phone: '', email: '', comments: '' });
    loadContacts();
  }

  async function deleteContact(id: string) {
    await supabase.from('client_contacts').delete().eq('id', id);
    loadContacts();
  }

  // === Messaging with templates ===
  function openWhatsApp(customMessage?: string) {
    if (!clientPhone) return;
    const phone = (clientPhone || '').replace(/[^\d]/g, '');
    const text = customMessage || messageTemplate;
    const url = text
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${phone}`;
    window.open(url, '_blank');
  }

  function openWhatsAppForPhone(phone: string, customMessage?: string) {
    const cleaned = (phone || '').replace(/[^\d]/g, '');
    const text = customMessage || messageTemplate;
    const url = text
      ? `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${cleaned}`;
    window.open(url, '_blank');
  }

  async function openMax(customMessage?: string) {
    const text = customMessage || messageTemplate;
    if (text) {
      await copyToClipboard(text);
    }
    window.open('https://web.max.ru/', '_blank');
  }

  async function openTelegram(username?: string, customMessage?: string) {
    const text = customMessage || messageTemplate;
    if (text) {
      await copyToClipboard(text);
    }
    if (username) {
      window.open(`https://t.me/${(username || '').replace('@', '')}`, '_blank');
    } else {
      window.open('https://web.telegram.org/', '_blank');
    }
  }

  function openEmailCompose(email: string) {
    setEmailRecipient(email);
    setShowEmailCompose(true);
  }

  if (!isOpen) return null;

  const tabs = [
    { id: 'scripts' as const, label: 'Скрипты', icon: '📋' },
    { id: 'messaging' as const, label: 'Связь', icon: '💬' },
    { id: 'contacts' as const, label: 'Контакты', icon: '👥' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-[51] bg-white shadow-2xl flex flex-col border-l border-gray-200" style={{ width: 'calc(100vw - 470px)', minWidth: '400px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm truncate">
            {clientName ? `Инструменты: ${clientName}` : 'Инструменты продаж'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* === SCRIPTS TAB === */}
        {activeTab === 'scripts' && (
          <div className="p-4">
            {isEditingScript ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedScript ? 'Редактировать скрипт' : 'Новый скрипт'}
                  </h3>
                  <button
                    onClick={() => setIsEditingScript(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Отмена
                  </button>
                </div>
                <input
                  type="text"
                  value={editScript.title}
                  onChange={(e) => setEditScript({ ...editScript, title: e.target.value })}
                  placeholder="Название скрипта"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                />
                <select
                  value={editScript.category}
                  onChange={(e) => setEditScript({ ...editScript, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                >
                  <option value="general">Общий</option>
                  <option value="b2b">B2B</option>
                  <option value="b2c">B2C</option>
                  <option value="objections">Возражения</option>
                  <option value="followup">Повторный звонок</option>
                </select>
                <textarea
                  value={editScript.content}
                  onChange={(e) => setEditScript({ ...editScript, content: e.target.value })}
                  placeholder="Текст скрипта..."
                  rows={16}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none resize-none font-mono leading-relaxed"
                />
                <button
                  onClick={saveScript}
                  disabled={!editScript.title.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Сохранить
                </button>
              </div>
            ) : selectedScript ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSelectedScript(null)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    ← Назад к списку
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditScript(selectedScript)}
                      className="text-xs text-gray-500 hover:text-indigo-500 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteScript(selectedScript.id)}
                      className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{selectedScript.title}</h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-600 mb-4">
                  {selectedScript.category === 'b2b' ? 'B2B' :
                   selectedScript.category === 'b2c' ? 'B2C' :
                   selectedScript.category === 'objections' ? 'Возражения' :
                   selectedScript.category === 'followup' ? 'Повторный' : 'Общий'}
                </span>
                <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed max-h-[calc(100vh-280px)] overflow-y-auto">
                  {selectedScript.content}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Скрипты продаж</h3>
                  <button
                    onClick={startNewScript}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    + Новый
                  </button>
                </div>
                {scripts.length > 0 ? (
                  <div className="space-y-2">
                    {scripts.map(script => (
                      <button
                        key={script.id}
                        onClick={() => setSelectedScript(script)}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                              {script.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {script.content.substring(0, 80)}...
                            </p>
                          </div>
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500 flex-shrink-0">
                            {script.category === 'b2b' ? 'B2B' :
                             script.category === 'objections' ? 'Возр.' :
                             script.category === 'followup' ? 'Повт.' : script.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm">Нет скриптов</p>
                    <p className="text-xs mt-1">Создайте первый скрипт продаж</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === MESSAGING TAB === */}
        {activeTab === 'messaging' && (
          <div className="p-4 space-y-4">
            {/* Step 1: Quick template from scripts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">1. Выберите шаблон сообщения</h3>
              <div className="space-y-1.5">
                {scripts.map(script => (
                  <button
                    key={script.id}
                    onClick={() => setMessageTemplate(generateMessage(script.content))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                      messageTemplate === generateMessage(script.content)
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{script.title}</span>
                  </button>
                ))}
                <button
                  onClick={() => setMessageTemplate('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                    messageTemplate === '' 
                      ? 'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Без шаблона
                </button>
              </div>
            </div>

            {/* Step 2: Preview and edit message */}
            {messageTemplate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">2. Текст сообщения</h3>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none"
                  rows={5}
                  placeholder="Текст сообщения..."
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    onClick={() => copyToClipboard(messageTemplate)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    📋 Копировать
                  </button>
                  <button
                    onClick={() => setMessageTemplate('')}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    Очистить
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Send via messenger */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {messageTemplate ? '3. Отправьте через мессенджер' : '2. Связаться с клиентом'}
              </h3>
              
              <div className="space-y-2">
                {/* WhatsApp - supports pre-filled text */}
                <button
                  onClick={() => openWhatsApp()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                    💬
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500">
                      {messageTemplate ? 'Откроется с текстом сообщения' : 'Откроется чат'}
                    </p>
                  </div>
                  {messageTemplate && <span className="text-xs text-green-600 font-medium">+ текст</span>}
                  <span className="text-gray-400">↗</span>
                </button>

                {/* MAX - copy to clipboard + open */}
                <button
                  onClick={() => openMax()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white text-lg">
                    💜
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Max (VK Teams)</p>
                    <p className="text-xs text-gray-500">
                      {messageTemplate ? 'Текст скопирован — вставьте Ctrl+V' : 'Откроется в новом окне'}
                    </p>
                  </div>
                  {messageTemplate && <span className="text-xs text-purple-600 font-medium">📋 скопировано</span>}
                  <span className="text-gray-400">↗</span>
                </button>

                {/* Telegram - copy to clipboard + open */}
                <button
                  onClick={() => openTelegram()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                    ✈️
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Telegram</p>
                    <p className="text-xs text-gray-500">
                      {messageTemplate ? 'Текст скопирован — вставьте Ctrl+V' : 'Откроется в новом окне'}
                    </p>
                  </div>
                  {messageTemplate && <span className="text-xs text-blue-600 font-medium">📋 скопировано</span>}
                  <span className="text-gray-400">↗</span>
                </button>
              </div>
            </div>

            {/* Phone info */}
            {clientPhone && (
              <div className="bg-gray-50 rounded-xl p-3 mt-2">
                <p className="text-xs text-gray-500">Телефон клиента</p>
                <p className="text-sm font-semibold text-gray-900">{clientPhone}</p>
              </div>
            )}

            {/* Email button */}
            <div className="pt-2 border-t">
              <button
                onClick={() => {
                  setEmailRecipient('');
                  setShowEmailCompose(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg">
                  ✉️
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Написать Email</p>
                  <p className="text-xs text-gray-500">Отправить письмо клиенту</p>
                </div>
              </button>
            </div>

            {/* Additional contact phones */}
            {contacts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Доп. контакты
                </p>
                <div className="space-y-1.5">
                  {contacts.filter(c => c.phone).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{c.full_name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openWhatsAppForPhone(c.phone)}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          title="WhatsApp"
                        >
                          💬
                        </button>
                        {c.email && (
                          <button
                            onClick={() => openEmailCompose(c.email)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Email"
                          >
                            ✉️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === CONTACTS TAB === */}
        {activeTab === 'contacts' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Доп. контакты {contacts.length > 0 && `(${contacts.length})`}
              </h3>
              <button
                onClick={startNewContact}
                className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium"
              >
                + Добавить
              </button>
            </div>

            {/* Add/Edit form */}
            {isAddingContact && (
              <div className="bg-indigo-50 rounded-xl p-4 mb-4 space-y-2">
                <h4 className="text-xs font-semibold text-indigo-700">
                  {editingContactId ? 'Редактировать' : 'Новый контакт'}
                </h4>
                <input
                  type="text"
                  value={editContact.full_name}
                  onChange={(e) => setEditContact({ ...editContact, full_name: e.target.value })}
                  placeholder="ФИО *"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={editContact.position}
                  onChange={(e) => setEditContact({ ...editContact, position: e.target.value })}
                  placeholder="Должность"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={editContact.phone}
                  onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                  placeholder="Телефон"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                />
                <input
                  type="email"
                  value={editContact.email}
                  onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                />
                <textarea
                  value={editContact.comments}
                  onChange={(e) => setEditContact({ ...editContact, comments: e.target.value })}
                  placeholder="Комментарий"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveContact}
                    disabled={!editContact.full_name.trim()}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => { setIsAddingContact(false); setEditingContactId(null); }}
                    className="px-4 py-2 border text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Contacts list */}
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="border border-gray-200 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.full_name}</p>
                        {c.position && (
                          <p className="text-xs text-indigo-600">{c.position}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditContactItem(c)}
                          className="p-1 text-gray-400 hover:text-indigo-500 rounded hover:bg-gray-100"
                          title="Редактировать"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteContact(c.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
                          title="Удалить"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">📞</span>
                          <button
                            onClick={() => openWhatsAppForPhone(c.phone)}
                            className="text-xs text-gray-700 hover:text-green-600 hover:underline"
                            title="Открыть WhatsApp"
                          >
                            {c.phone}
                          </button>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">✉️</span>
                          <button
                            onClick={() => openEmailCompose(c.email)}
                            className="text-xs text-gray-700 hover:text-blue-600 hover:underline"
                          >
                            {c.email}
                          </button>
                        </div>
                      )}
                      {c.comments && (
                        <p className="text-xs text-gray-500 mt-1 italic">{c.comments}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !isAddingContact ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm">Нет дополнительных контактов</p>
                <p className="text-xs mt-1">Добавьте контактных лиц организации</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Email compose modal */}
      <ComposeEmailModal
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        toEmail={emailRecipient}
        clientName={clientName}
      />

      {/* Copied toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="text-lg">✅</span>
          <span className="text-sm font-medium">Сообщение скопировано в буфер обмена</span>
        </div>
      )}
    </div>
  );
}

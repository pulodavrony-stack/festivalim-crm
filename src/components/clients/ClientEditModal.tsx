'use client';

import { useState, useEffect } from 'react';
import { useSchemaClient } from '@/components/providers/TeamProvider';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  client_type: 'lead' | 'pk' | 'kb';
  status: string;
  telegram_username: string;
  whatsapp_phone: string;
  notes: string;
  city_id: string;
  source_id: string;
  manager_id: string;
  preferred_price_range: string;
  rejection_points: number;
}

interface City {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  is_auto: boolean;
}

interface ClientEditModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function ClientEditModal({ clientId, isOpen, onClose, onSave }: ClientEditModalProps) {
  const supabase = useSchemaClient();
  const [client, setClient] = useState<Client | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [clientTags, setClientTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    client_type: 'lead' as 'lead' | 'pk' | 'kb',
    telegram_username: '',
    whatsapp_phone: '',
    notes: '',
    city_id: '',
    source_id: '',
    manager_id: '',
    preferred_price_range: '',
    rejection_points: 0,
  });

  useEffect(() => {
    if (isOpen && clientId) {
      loadData();
    }
  }, [isOpen, clientId]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [clientResult, citiesResult, sourcesResult, managersResult, tagsResult, clientTagsResult] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('cities').select('*').order('name'),
      supabase.from('lead_sources').select('*').order('name'),
      supabase.from('managers').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('tags').select('*').order('name'),
      supabase.from('client_tags').select('tag_id').eq('client_id', clientId),
    ]);

    if (clientResult.data) {
      setClient(clientResult.data);
      setFormData({
        full_name: clientResult.data.full_name || '',
        phone: clientResult.data.phone || '',
        email: clientResult.data.email || '',
        client_type: clientResult.data.client_type || 'lead',
        telegram_username: clientResult.data.telegram_username || '',
        whatsapp_phone: clientResult.data.whatsapp_phone || '',
        notes: clientResult.data.notes || '',
        city_id: clientResult.data.city_id || '',
        source_id: clientResult.data.source_id || '',
        manager_id: clientResult.data.manager_id || '',
        preferred_price_range: clientResult.data.preferred_price_range || '',
        rejection_points: clientResult.data.rejection_points || 0,
      });
    }

    if (citiesResult.data) setCities(citiesResult.data);
    if (sourcesResult.data) setSources(sourcesResult.data);
    if (managersResult.data) setManagers(managersResult.data);
    if (tagsResult.data) setAllTags(tagsResult.data);
    if (clientTagsResult.data) setClientTags(clientTagsResult.data.map(ct => ct.tag_id));

    setLoading(false);
  }

  async function handleAddTag(tagId: string) {
    if (clientTags.includes(tagId)) return;
    
    const { error } = await supabase
      .from('client_tags')
      .insert({ client_id: clientId, tag_id: tagId });
    
    if (!error) {
      setClientTags([...clientTags, tagId]);
    }
  }

  async function handleRemoveTag(tagId: string) {
    const { error } = await supabase
      .from('client_tags')
      .delete()
      .eq('client_id', clientId)
      .eq('tag_id', tagId);
    
    if (!error) {
      setClientTags(clientTags.filter(id => id !== tagId));
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: newTagName.trim(), category: 'custom', is_auto: false })
      .select()
      .single();
    
    if (data && !error) {
      setAllTags([...allTags, data]);
      await handleAddTag(data.id);
      setNewTagName('');
      setShowTagInput(false);
    }
  }

  async function handleAddRejectionPoint() {
    const { data, error } = await supabase.rpc('add_rejection_point', {
      p_client_id: clientId,
      p_city_name: cities.find(c => c.id === formData.city_id)?.name
    });
    
    if (!error && data) {
      setFormData({ ...formData, rejection_points: formData.rejection_points + 1 });
      // Перезагружаем данные если статус изменился
      if (data.action === 'became_vip' || data.action === 'moved_to_mailings') {
        loadData();
      }
    }
  }

  async function handleResetRejectionPoints() {
    const { error } = await supabase
      .from('clients')
      .update({ rejection_points: 0 })
      .eq('id', clientId);
    
    if (!error) {
      setFormData({ ...formData, rejection_points: 0 });
    }
  }

  async function handleSave() {
    if (!client) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || null,
          client_type: formData.client_type,
          telegram_username: formData.telegram_username || null,
          whatsapp_phone: formData.whatsapp_phone || null,
          notes: formData.notes || null,
          city_id: formData.city_id || null,
          source_id: formData.source_id || null,
          manager_id: formData.manager_id || null,
          preferred_price_range: formData.preferred_price_range || null,
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      onSave?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Редактирование клиента
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ФИО *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Телефон *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип клиента
                    </label>
                    <select
                      value={formData.client_type}
                      onChange={(e) => setFormData({ ...formData, client_type: e.target.value as any })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                    >
                      <option value="lead">Лид</option>
                      <option value="pk">Потенциальный клиент</option>
                      <option value="kb">Клиентская база</option>
                    </select>
                  </div>
                </div>

                {/* Contacts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telegram
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 rounded-l-lg bg-gray-50 text-gray-500">
                        @
                      </span>
                      <input
                        type="text"
                        value={formData.telegram_username}
                        onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
                        className="flex-1 px-4 py-2 border rounded-r-lg focus:border-red-500 outline-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={formData.whatsapp_phone}
                      onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      placeholder="+7..."
                    />
                  </div>
                </div>

                {/* Additional */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Город
                    </label>
                    <select
                      value={formData.city_id}
                      onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                    >
                      <option value="">Не выбран</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Источник
                    </label>
                    <select
                      value={formData.source_id}
                      onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                    >
                      <option value="">Не выбран</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Менеджер
                    </label>
                    <select
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                    >
                      <option value="">Не назначен</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ценовой сегмент
                  </label>
                  <select
                    value={formData.preferred_price_range}
                    onChange={(e) => setFormData({ ...formData, preferred_price_range: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                  >
                    <option value="">Не указан</option>
                    <option value="economy">Эконом (до 3000₽)</option>
                    <option value="standard">Стандарт (3000-7000₽)</option>
                    <option value="premium">Премиум (7000-15000₽)</option>
                    <option value="vip">VIP (от 15000₽)</option>
                  </select>
                </div>

                {/* Теги */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Теги
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {clientTags.map(tagId => {
                      const tag = allTags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.name}
                          {!tag.is_auto && (
                            <button
                              onClick={() => handleRemoveTag(tag.id)}
                              className="ml-1 hover:opacity-70"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                    {clientTags.length === 0 && (
                      <span className="text-gray-400 text-sm">Нет тегов</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {showTagInput ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="flex-1 px-3 py-1 border rounded-lg text-sm focus:border-red-500 outline-none"
                          placeholder="Название нового тега..."
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                        />
                        <button
                          onClick={handleCreateTag}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        >
                          Создать
                        </button>
                        <button
                          onClick={() => { setShowTagInput(false); setNewTagName(''); }}
                          className="px-3 py-1 text-gray-500 hover:text-gray-700"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <>
                        <select
                          onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ''; }}
                          className="flex-1 px-3 py-1 border rounded-lg text-sm focus:border-red-500 outline-none"
                        >
                          <option value="">Добавить тег...</option>
                          {allTags.filter(t => !clientTags.includes(t.id) && !t.is_auto).map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowTagInput(true)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                        >
                          + Новый тег
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Точки отказа */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Точки отказа ({formData.rejection_points}/5)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((point) => (
                        <button
                          key={point}
                          onClick={() => point > formData.rejection_points && handleAddRejectionPoint()}
                          className={`w-6 h-6 rounded-full border-2 transition-colors ${
                            point <= formData.rejection_points
                              ? 'bg-red-500 border-red-500'
                              : 'bg-white border-gray-300 hover:border-red-300'
                          }`}
                          disabled={point <= formData.rejection_points}
                        />
                      ))}
                    </div>
                    {formData.rejection_points > 0 && (
                      <button
                        onClick={handleResetRejectionPoints}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                      >
                        Сбросить
                      </button>
                    )}
                    {formData.rejection_points >= 5 && (
                      <span className="text-sm text-amber-600 font-medium">→ Станет VIP</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    При 5 точках клиент становится VIP. При покупке точки сбрасываются.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заметки
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none resize-none"
                    rows={3}
                    placeholder="Дополнительная информация о клиенте..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.full_name || !formData.phone}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

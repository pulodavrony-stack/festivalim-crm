'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';

interface Pipeline {
  id: string;
  name: string;
  code: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  pipeline_id: string;
  sort_order: number;
}

interface City {
  id: string;
  name: string;
}

interface ClientPreview {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city_id: string;
}

export default function EmailPage() {
  const supabase = useSchemaClient();
  const { teamSchema, isLoading: teamLoading } = useTeam();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [clients, setClients] = useState<ClientPreview[]>([]);

  const [mode, setMode] = useState<'pipeline' | 'all'>('pipeline');
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [isHtml, setIsHtml] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'compose' | 'preview' | 'result'>('compose');
  const [senderInfo, setSenderInfo] = useState({ email: '', name: '' });

  useEffect(() => {
    if (!teamLoading) {
      loadData();
      fetch(`/api/email/send?schema=${teamSchema}`)
        .then(r => r.json())
        .then(data => {
          if (data.senderEmail) setSenderInfo({ email: data.senderEmail, name: data.senderName });
        })
        .catch(() => {});
    }
  }, [teamLoading]);

  useEffect(() => {
    if (selectedPipeline) {
      loadStages();
    }
  }, [selectedPipeline]);

  useEffect(() => {
    if (mode === 'pipeline' && selectedPipeline) {
      loadPreview();
    } else if (mode === 'all') {
      loadAllContacts();
    }
  }, [selectedPipeline, selectedStage, selectedCity, mode]);

  async function loadData() {
    const [pipelinesRes, citiesRes] = await Promise.all([
      supabase.from('pipelines').select('*').order('sort_order'),
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (pipelinesRes.data) setPipelines(pipelinesRes.data);
    if (citiesRes.data) setCities(citiesRes.data);
  }

  async function loadStages() {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', selectedPipeline)
      .order('sort_order');
    if (data) setStages(data);
  }

  async function loadAllContacts() {
    setLoading(true);
    let query = supabase
      .from('clients')
      .select('id, full_name, email, phone, city_id')
      .not('email', 'is', null)
      .neq('email', '');

    if (selectedCity) query = query.eq('city_id', selectedCity);

    const { data } = await query.order('full_name');
    if (data) setClients(data);
    setLoading(false);
  }

  async function loadPreview() {
    setLoading(true);
    let query = supabase
      .from('deals')
      .select('client:clients(id, full_name, email, phone, city_id)')
      .eq('status', 'active')
      .eq('pipeline_id', selectedPipeline);

    if (selectedStage) query = query.eq('stage_id', selectedStage);

    const { data } = await query;

    if (data) {
      const map = new Map<string, ClientPreview>();
      for (const deal of data) {
        const c = deal.client as any;
        if (!c || !c.email) continue;
        if (selectedCity && c.city_id !== selectedCity) continue;
        if (!map.has(c.id)) map.set(c.id, c);
      }
      setClients(Array.from(map.values()));
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!subject.trim() || !bodyTemplate.trim() || clients.length === 0) return;
    setSending(true);
    setResult(null);

    try {
      const endpoint = mode === 'all' ? '/api/email/bulk-direct' : '/api/email/bulk';
      const payload = mode === 'all'
        ? {
            schema: teamSchema,
            subject,
            body_template: bodyTemplate,
            is_html: isHtml,
            client_ids: clients.map(c => c.id),
          }
        : {
            schema: teamSchema,
            pipeline_id: selectedPipeline || undefined,
            stage_id: selectedStage || undefined,
            city_id: selectedCity || undefined,
            subject,
            body_template: bodyTemplate,
            is_html: isHtml,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  }

  const selectedPipelineName = pipelines.find(p => p.id === selectedPipeline)?.name;
  const selectedStageName = stages.find(s => s.id === selectedStage)?.name;
  const selectedCityName = cities.find(c => c.id === selectedCity)?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              ← Главная
            </Link>
            <h1 className="text-xl font-bold text-gray-900">✉️ Email рассылки</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {step === 'compose' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Settings */}
            <div className="col-span-2 space-y-6">
              {/* Sender Info */}
              {senderInfo.email && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">✉️</span>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Отправитель: {senderInfo.name}</p>
                    <p className="text-xs text-blue-700">{senderInfo.email}</p>
                  </div>
                </div>
              )}

              {/* Segment */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Выберите получателей</h2>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setMode('pipeline'); setClients([]); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'pipeline' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    По воронке
                  </button>
                  <button
                    onClick={() => { setMode('all'); setSelectedPipeline(''); setSelectedStage(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Все контакты с email
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {mode === 'pipeline' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Воронка</label>
                        <select
                          value={selectedPipeline}
                          onChange={(e) => {
                            setSelectedPipeline(e.target.value);
                            setSelectedStage('');
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:border-blue-500 outline-none"
                        >
                          <option value="">Выберите воронку</option>
                          {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Этап</label>
                        <select
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                          disabled={!selectedPipeline}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:border-blue-500 outline-none disabled:bg-gray-100"
                        >
                          <option value="">Все этапы</option>
                          {stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Все города</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Compose */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Напишите письмо</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тема письма
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Предложение о сотрудничестве — «Кстати театр»"
                      className="w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Текст письма
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Переменные:</span>
                        {['{name}', '{email}', '{phone}', '{organization}'].map(v => (
                          <button
                            key={v}
                            onClick={() => setBodyTemplate(prev => prev + v)}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={bodyTemplate}
                      onChange={(e) => setBodyTemplate(e.target.value)}
                      placeholder={`Здравствуйте, {name}!\n\nМеня зовут ..., я представляю театральную компанию «Кстати театр».\n\nМы организуем выездные спектакли для школ и детских учреждений...\n\nБудем рады сотрудничеству!\n\nС уважением,\nКоманда «Кстати театр»`}
                      rows={14}
                      className="w-full px-4 py-3 border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none leading-relaxed font-mono"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isHtml}
                      onChange={(e) => setIsHtml(e.target.checked)}
                      className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    HTML-формат (для продвинутых шаблонов)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep('preview')}
                  disabled={!subject.trim() || !bodyTemplate.trim() || clients.length === 0}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  Предпросмотр и отправка →
                </button>
                <span className="text-sm text-gray-500">
                  {clients.length > 0 
                    ? `Будет отправлено ${clients.length} писем`
                    : 'Выберите сегмент для рассылки'}
                </span>
              </div>
            </div>

            {/* Right: Preview recipients */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Получатели
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {loading ? '...' : clients.length}
                  </span>
                </h3>

                {mode === 'pipeline' && !selectedPipeline ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Выберите воронку
                  </p>
                ) : loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : clients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Нет клиентов с email
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {clients.map(c => (
                      <div key={c.id} className="p-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.full_name}</p>
                        <p className="text-xs text-blue-600 truncate">{c.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Подсказка</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Используйте переменные в тексте письма для персонализации:
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li><code className="bg-blue-100 px-1 rounded">{'{name}'}</code> — ФИО контакта</li>
                  <li><code className="bg-blue-100 px-1 rounded">{'{email}'}</code> — Email</li>
                  <li><code className="bg-blue-100 px-1 rounded">{'{phone}'}</code> — Телефон</li>
                  <li><code className="bg-blue-100 px-1 rounded">{'{organization}'}</code> — Организация</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Предпросмотр рассылки</h2>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Воронка:</span>
                  <span className="font-medium text-gray-900">{selectedPipelineName || 'Все'}</span>
                </div>
                {selectedStageName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Этап:</span>
                    <span className="font-medium text-gray-900">{selectedStageName}</span>
                  </div>
                )}
                {selectedCityName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Город:</span>
                    <span className="font-medium text-gray-900">{selectedCityName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Получателей:</span>
                  <span className="font-bold text-blue-600">{clients.length}</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  Тема: {subject}
                </div>
                <div className="px-4 py-4 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed max-h-64 overflow-y-auto">
                  {bodyTemplate}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-6">
                Внимание: будет отправлено <strong>{clients.length}</strong> писем. Это действие нельзя отменить.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Отправка... ({clients.length})
                    </>
                  ) : (
                    <>✉️ Отправить {clients.length} писем</>
                  )}
                </button>
                <button
                  onClick={() => setStep('compose')}
                  disabled={sending}
                  className="px-6 py-3 border text-gray-600 rounded-xl text-sm hover:bg-gray-50"
                >
                  ← Назад
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              {result.error ? (
                <>
                  <div className="text-5xl mb-4">❌</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка рассылки</h2>
                  <p className="text-red-600 mb-6">{result.error}</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">✅</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Рассылка завершена!</h2>
                  <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-green-600">{result.sent}</p>
                      <p className="text-sm text-gray-500">Отправлено</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                      <p className="text-sm text-gray-500">Ошибок</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-blue-600">{result.total_clients}</p>
                      <p className="text-sm text-gray-500">Всего</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setStep('compose');
                    setResult(null);
                  }}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm"
                >
                  Новая рассылка
                </button>
                <Link
                  href="/pipeline"
                  className="px-6 py-3 border text-gray-600 rounded-xl text-sm hover:bg-gray-50"
                >
                  К воронке
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

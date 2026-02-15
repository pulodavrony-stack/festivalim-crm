// =============================================
// ФЕСТИВАЛИМ: AI Module
// =============================================
// Использует Claude API для:
// - Генерации персонализированных сообщений
// - Анализа входящих сообщений
// - Подсказок менеджеру
// =============================================

import Anthropic from '@anthropic-ai/sdk';
import type { Client, Event, Message, MessageTemplate } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================
// ГЕНЕРАЦИЯ СООБЩЕНИЙ
// =============================================

interface GenerateMessageParams {
  client: Client;
  event?: Event & { show?: { title: string } | { title: string }[] };
  template?: MessageTemplate;
  purpose: 'greeting' | 'reminder' | 'promo' | 'followup' | 'callback';
  customInstructions?: string;
}

export async function generateMessage(params: GenerateMessageParams): Promise<string> {
  const { client, event, template, purpose, customInstructions } = params;

  const systemPrompt = `Ты — помощник менеджера по продажам билетов на театральные спектакли.
Генерируй короткие, тёплые сообщения для клиентов. Целевая аудитория — женщины 40+.

Правила:
- Обращайся на "Вы"
- Будь дружелюбным, но не навязчивым
- Используй эмодзи умеренно (1-2 на сообщение)
- Сообщение должно быть коротким (2-4 предложения)
- Упоминай конкретные детали (имя, спектакль, город)
- Не используй восклицательные знаки чрезмерно`;

  const clientInfo = `
Клиент: ${client.full_name}
Тип: ${client.client_type === 'kb' ? 'Постоянный клиент' : client.client_type === 'pk' ? 'Потенциальный клиент' : 'Новый'}
Покупок: ${client.total_purchases}
Город: ${client.city_id ? 'указан' : 'не указан'}
${client.preferred_genres?.length ? `Предпочтения: ${client.preferred_genres.join(', ')}` : ''}`;

  const eventInfo = event ? `
Спектакль: ${event.show?.title || 'неизвестно'}
Дата: ${new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
Город: событие в базе
${event.min_price && event.max_price ? `Цены: от ${event.min_price} до ${event.max_price} ₽` : ''}` : '';

  const purposeDescriptions = {
    greeting: 'Приветственное сообщение новому клиенту',
    reminder: 'Напоминание о предстоящем спектакле',
    promo: 'Приглашение на новый спектакль',
    followup: 'Повторное касание после разговора',
    callback: 'Просьба перезвонить',
  };

  const userPrompt = `${purposeDescriptions[purpose]}

${clientInfo}
${eventInfo}

${template ? `Используй этот шаблон как основу: "${template.content}"` : ''}
${customInstructions ? `Дополнительные инструкции: ${customInstructions}` : ''}

Сгенерируй одно сообщение:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text || '';
  } catch (error) {
    console.error('AI message generation error:', error);
    throw error;
  }
}

// =============================================
// АНАЛИЗ СООБЩЕНИЙ
// =============================================

interface AnalyzeMessageResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  suggestedReply?: string;
  urgency: 'low' | 'medium' | 'high';
  topics: string[];
}

export async function analyzeMessage(
  message: string,
  client: Client,
  conversationHistory?: Message[]
): Promise<AnalyzeMessageResult> {
  const systemPrompt = `Ты анализируешь сообщения клиентов театрального агентства.
Определи:
1. Эмоциональный тон (positive/neutral/negative)
2. Намерение клиента (что хочет)
3. Срочность (low/medium/high)
4. Темы сообщения

Отвечай строго в JSON формате.`;

  const context = conversationHistory?.slice(-5).map(m => 
    `${m.direction === 'inbound' ? 'Клиент' : 'Менеджер'}: ${m.content}`
  ).join('\n') || '';

  const userPrompt = `Клиент: ${client.full_name} (${client.client_type === 'kb' ? 'постоянный' : 'новый'})

${context ? `Контекст переписки:\n${context}\n\n` : ''}Новое сообщение от клиента:
"${message}"

Проанализируй и ответь в JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "intent": "краткое описание намерения",
  "suggestedReply": "предложенный ответ или null",
  "urgency": "low" | "medium" | "high",
  "topics": ["тема1", "тема2"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    const text = textBlock?.text || '{}';
    
    // Извлекаем JSON из ответа
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      sentiment: 'neutral',
      intent: 'неизвестно',
      urgency: 'medium',
      topics: [],
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      sentiment: 'neutral',
      intent: 'ошибка анализа',
      urgency: 'medium',
      topics: [],
    };
  }
}

// =============================================
// ПОДСКАЗКИ ДЛЯ МЕНЕДЖЕРА
// =============================================

interface ManagerHint {
  type: 'info' | 'warning' | 'suggestion';
  text: string;
}

export async function getManagerHints(
  client: Client,
  currentDealAmount?: number
): Promise<ManagerHint[]> {
  const hints: ManagerHint[] = [];

  // Постоянный клиент
  if (client.client_type === 'kb' && client.total_purchases > 0) {
    hints.push({
      type: 'info',
      text: `🎭 Постоянный клиент! ${client.total_purchases} покупок на сумму ${client.total_revenue?.toLocaleString('ru-RU')} ₽`,
    });
  }

  // VIP
  if (client.status === 'vip') {
    hints.push({
      type: 'warning',
      text: '⭐ VIP-клиент — особое внимание!',
    });
  }

  // Давно не покупал
  if (client.last_purchase_date) {
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(client.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePurchase > 180) {
      hints.push({
        type: 'suggestion',
        text: `📅 Давно не покупал (${daysSincePurchase} дней). Предложите скидку?`,
      });
    }
  }

  // Предпочтения
  if (client.preferred_genres?.length) {
    hints.push({
      type: 'info',
      text: `🎬 Любит: ${client.preferred_genres.join(', ')}`,
    });
  }

  // Предпочтения по цене
  if (client.preferred_price_range === 'premium') {
    hints.push({
      type: 'suggestion',
      text: '💎 Предпочитает премиум — предлагайте лучшие места',
    });
  } else if (client.preferred_price_range === 'economy') {
    hints.push({
      type: 'suggestion',
      text: '💰 Важна цена — упомяните скидку или акцию',
    });
  }

  return hints;
}

// =============================================
// СКРИПТ ПРОДАЖ
// =============================================

interface SalesScriptStep {
  step: number;
  title: string;
  script: string;
  tips: string[];
  objectionHandlers?: { objection: string; response: string }[];
}

export async function getSalesScript(
  client: Client,
  event: Event & { show?: { title: string } | { title: string }[] }
): Promise<SalesScriptStep[]> {
  const isNewClient = client.client_type === 'lead';
  const showTitle = event.show?.title || 'спектакль';
  
  const script: SalesScriptStep[] = [
    {
      step: 1,
      title: 'Приветствие',
      script: isNewClient
        ? `Добрый день, ${client.full_name.split(' ')[0]}! Меня зовут [ИМЯ], театральное агентство ФЕСТИВАЛИМ. Вы оставляли заявку на нашем сайте, верно?`
        : `Добрый день, ${client.full_name.split(' ')[0]}! Это [ИМЯ] из ФЕСТИВАЛИМ. Как ваши дела? Помните, как ходили на [ПРОШЛЫЙ СПЕКТАКЛЬ]?`,
      tips: [
        'Улыбайтесь — это слышно в голосе',
        'Говорите спокойно и уверенно',
      ],
    },
    {
      step: 2,
      title: 'Выявление потребности',
      script: `Скажите, вы любите театр? Какие спектакли предпочитаете — комедии, драмы, мюзиклы?`,
      tips: [
        'Слушайте внимательно',
        'Запоминайте ответы для будущих продаж',
      ],
    },
    {
      step: 3,
      title: 'Презентация',
      script: `Отлично! Тогда вам точно понравится "${showTitle}"! Это [ОПИСАНИЕ]. Спектакль пройдёт ${new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}. Многие наши клиенты в восторге!`,
      tips: [
        'Используйте эмоциональные слова',
        'Ссылайтесь на отзывы других клиентов',
      ],
      objectionHandlers: [
        {
          objection: 'Дорого',
          response: 'Понимаю! У нас есть места по разным ценам. А ещё для вас как для нашего клиента — скидка 10%.',
        },
        {
          objection: 'Нет времени',
          response: 'Спектакль идёт всего 2 часа. Это отличная возможность отдохнуть и получить заряд эмоций!',
        },
        {
          objection: 'Подумаю',
          response: 'Конечно! Только учтите, что билеты разбирают быстро. Могу забронировать для вас места до завтра?',
        },
      ],
    },
    {
      step: 4,
      title: 'Закрытие',
      script: `Итак, бронирую для вас [КОЛИЧЕСТВО] билетов на ${new Date(event.event_date).toLocaleDateString('ru-RU')}. Какие места предпочитаете — партер или балкон?`,
      tips: [
        'Говорите уверенно, как будто решение уже принято',
        'Предлагайте выбор из двух вариантов',
      ],
    },
  ];

  return script;
}

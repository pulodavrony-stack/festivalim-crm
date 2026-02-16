// =============================================
// API: Add Tula Schools to CRM as Clients
// POST /api/admin/add-tula-schools
// Team: Кстати театр (schema: kstati)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create schema-specific client
function createSchemaClient(schema: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: schema
    }
  });
}

// Public admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Данные школ Тулы из официальных источников
// Добавляем как клиентов с типом "lead" и всей доступной информацией
const TULA_SCHOOLS = [
  {
    full_name: 'Уткин Сергей Николаевич',
    organization: 'Детская школа искусств №4 г. Тулы',
    position: 'Директор',
    phone: '+7 (4872) 23-08-98',
    email: 'dshi4@tularegion.org',
    notes: `🏫 МБУДО ДШИ № 4 (Детская школа искусств №4)
📍 Адрес: ул. Гагарина (Косая Гора), 1, Тула, 300903
🌐 Сайт: https://dshi4-tula.ru
📞 Доп. телефон: +7 (4872) 77-03-74
⏰ Режим работы: пн-пт 9:00-20:00, сб 10:00-20:00

👥 Другие контакты:
• Агина Татьяна Сергеевна - Зам. директора по УВР, тел: +7 (4872) 23-08-98
• Ныркова Елизавета Сергеевна - Зам. директора по АХЧ
• Юдина Галина Александровна - Главный бухгалтер

📝 Работает с 1964 года. Муниципальное учреждение.`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Богородицкий Юрий Юрьевич',
    organization: 'Тульский государственный театр кукол',
    position: 'И.О. художественного руководителя',
    phone: '+7 (4872) 75-25-05',
    email: 'teatrkukol@tularegion.ru',
    notes: `🎭 ГУК ТО "Театр кукол"
📍 Адрес: ул. Советская, 62/15, Тула, 300000
🌐 Сайт: https://teatrkukol71.ru
📞 Билетная касса: +7(4872) 75-25-45
📞 Коллективные заявки: +7(4872) 75-25-15

👥 Другие контакты:
• Румянцева Ирина Всеволодовна - Начальник отдела по работе со зрителями, тел: +7(4872) 75-25-15

🏛 Учредитель: Министерство культуры Тульской области`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Директор ДМШИ №6',
    organization: 'Детская музыкальная школа искусств № 6 г. Тулы',
    position: 'Директор',
    phone: '+7 (4872) 239-17-22',
    email: '',
    notes: `🎵 МБУДО ДМШИ № 6
📍 Адрес: ул. Маршала Жукова, 8, Тула

Детская музыкальная школа искусств`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Директор ДМШ им. Райхеля',
    organization: 'Тульская областная детская музыкальная школа им. Г.З. Райхеля',
    position: 'Директор',
    phone: '+7 (4872) 35-21-87',
    email: '',
    notes: `🎵 ДМШ им. Г.З. Райхеля
📍 Адрес: пр. Ленина, 95а, Тула

Областная музыкальная школа, названа в честь Г.З. Райхеля`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Директор ТЮЗ',
    organization: 'Тульский областной театр юного зрителя',
    position: 'Директор',
    phone: '+7 (4872) 56-97-66',
    email: '',
    notes: `🎭 ТЮЗ Тула
📍 Адрес: ул. Коминтерна, 2, Тула

Областной театр юного зрителя`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Руководитель студии Зеркало',
    organization: 'Театр-студия "Зеркало"',
    position: 'Руководитель',
    phone: '+7 (920) 783-89-82',
    email: '',
    notes: `🎭 Театр-студия "Зеркало"
📍 Адрес: ул. Демидовская, 52, Тула

Частная детская театральная студия`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Руководитель "Форма Свободы"',
    organization: 'Театральная мастерская "Форма Свободы"',
    position: 'Руководитель',
    phone: '+7 (962) 272-22-10',
    email: '',
    notes: `🎭 Театральная мастерская "Форма Свободы"
📍 Адрес: ул. Свободы, 37 к2, Тула

Театральная мастерская для детей и взрослых`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Руководитель школы "Прима"',
    organization: 'Модельно-артистическая школа "Прима"',
    position: 'Руководитель',
    phone: '+7 (910) 151-94-41',
    email: '',
    notes: `💃 Модельно-артистическая школа "Прима"
📍 Адрес: ул. Кирова, 135, Тула

Модельная и артистическая школа для детей`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Руководитель студии "MUSE"',
    organization: 'Творческая студия "MUSE"',
    position: 'Руководитель',
    phone: '+7 (920) 761-50-41',
    email: '',
    notes: `🎨 Творческая студия "MUSE"
📍 Адрес: Красноармейский проспект, 7, Тула

Творческая студия для детей`,
    client_type: 'lead',
    status: 'new'
  },
  {
    full_name: 'Директор ДШИ №5',
    organization: 'Детская школа искусств № 5 г. Тулы',
    position: 'Директор',
    phone: '',
    email: '',
    notes: `🏫 МБУДО ДШИ № 5
📍 Адрес: Центральная ул., 1, посёлок Южный, Тула

Муниципальная школа искусств`,
    client_type: 'lead',
    status: 'new'
  }
];

// Normalize phone number
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    // Use kstati schema for "Кстати театр" team
    const dbClient = createSchemaClient('kstati');
    
    // First, get or create Tula city in kstati schema
    let tulaCity: { id: string } | null = null;
    
    const { data: existingCity, error: cityError } = await dbClient
      .from('cities')
      .select('id')
      .eq('name', 'Тула')
      .single();
    
    if (existingCity) {
      tulaCity = existingCity;
    } else if (cityError?.code === 'PGRST116') {
      // City doesn't exist, create it
      const { data: newCity, error: createCityError } = await dbClient
        .from('cities')
        .insert({ name: 'Тула', region: 'Тульская область', is_active: true })
        .select()
        .single();
      
      if (newCity) {
        tulaCity = newCity;
      } else {
        console.log('City create error:', createCityError);
      }
    }

    // Get B2B pipeline and first stage
    let b2bPipelineId: string | null = null;
    let firstStageId: string | null = null;
    
    const { data: pipeline } = await dbClient
      .from('pipelines')
      .select('id')
      .eq('code', 'b2b')
      .single();
    
    if (pipeline) {
      b2bPipelineId = pipeline.id;
      
      const { data: stage } = await dbClient
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', b2bPipelineId)
        .eq('code', 'first_contact')
        .single();
      
      if (stage) {
        firstStageId = stage.id;
      }
    }

    const results: Array<{ 
      name: string;
      organization: string;
      status: string; 
      client_id?: string;
      deal_created?: boolean;
      error?: string 
    }> = [];

    for (const school of TULA_SCHOOLS) {
      try {
        // Check if client already exists by phone
        let existing = null;
        if (school.phone) {
          const normalized = normalizePhone(school.phone);
          const { data } = await dbClient
            .from('clients')
            .select('id')
            .eq('phone_normalized', normalized)
            .single();
          existing = data;
        }

        if (existing) {
          results.push({ 
            name: school.full_name, 
            organization: school.organization,
            status: 'already_exists', 
            client_id: existing.id 
          });
          continue;
        }

        // Insert client (minimal columns to ensure compatibility)
        const { data: client, error: clientError } = await dbClient
          .from('clients')
          .insert({
            full_name: school.full_name,
            phone: school.phone || null,
            phone_normalized: normalizePhone(school.phone),
            email: school.email || null,
            city_id: tulaCity?.id || null,
            client_type: school.client_type,
            status: school.status,
            notes: school.notes
          })
          .select()
          .single();

        if (clientError) {
          results.push({ 
            name: school.full_name,
            organization: school.organization,
            status: 'error', 
            error: clientError.message 
          });
          continue;
        }

        // Create B2B deal if pipeline exists
        let dealCreated = false;
        if (b2bPipelineId && firstStageId && client) {
          const { error: dealError } = await dbClient
            .from('deals')
            .insert({
              client_id: client.id,
              pipeline_id: b2bPipelineId,
              stage_id: firstStageId,
              title: `B2B: ${school.organization}`,
              amount: 0,
              is_b2b: true,
              status: 'active'
            });
          
          dealCreated = !dealError;
        }

        results.push({ 
          name: school.full_name,
          organization: school.organization,
          status: 'created',
          client_id: client?.id,
          deal_created: dealCreated
        });

      } catch (err: any) {
        results.push({ 
          name: school.full_name,
          organization: school.organization,
          status: 'error', 
          error: err.message 
        });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'already_exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      team: 'Кстати театр',
      schema: 'kstati',
      city: tulaCity ? 'Тула (создан/найден)' : 'не удалось создать',
      pipeline: b2bPipelineId ? 'B2B (найден)' : 'не найден',
      summary: {
        total: TULA_SCHOOLS.length,
        created,
        existing,
        errors
      },
      results
    });

  } catch (error: any) {
    console.error('Error adding schools:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    team: 'Кстати театр',
    schema: 'kstati',
    schools: TULA_SCHOOLS.map(s => ({
      full_name: s.full_name,
      organization: s.organization,
      position: s.position,
      phone: s.phone,
      email: s.email
    })),
    count: TULA_SCHOOLS.length,
    note: 'Данные из публичных источников (официальные сайты школ г. Тулы). Для добавления в CRM отправьте POST запрос.'
  });
}

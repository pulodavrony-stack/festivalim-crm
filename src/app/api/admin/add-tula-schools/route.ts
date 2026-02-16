// =============================================
// API: Add Tula Schools to CRM (B2B Module)
// POST /api/admin/add-tula-schools
// Team: Кстати театр (schema: kstati)
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create schema-specific client for kstati team
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

// Public admin client for cross-schema operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Данные школ Тулы из официальных источников
const TULA_SCHOOLS = [
  {
    // Компания
    name: 'Детская школа искусств №4 г. Тулы',
    legal_name: 'Муниципальное бюджетное учреждение дополнительного образования «Детская школа искусств № 4»',
    short_name: 'МБУДО ДШИ № 4',
    company_type: 'school',
    actual_address: 'ул. Гагарина (Косая Гора), 1, Тула, 300903',
    phone: '+7 (4872) 23-08-98',
    email: 'dshi4@tularegion.org',
    website: 'https://dshi4-tula.ru',
    notes: 'Работает с 1964 года. Доп. телефон: +7 (4872) 77-03-74. Режим работы: пн-пт 9:00-20:00, сб 10:00-20:00',
    // Контакты
    contacts: [
      {
        full_name: 'Уткин Сергей Николаевич',
        position: 'Директор',
        phone: '+7 (4872) 23-08-98',
        email: 'dshi4@tularegion.org',
        is_primary: true,
        is_decision_maker: true
      },
      {
        full_name: 'Агина Татьяна Сергеевна',
        position: 'Заместитель директора по учебно-воспитательной работе',
        phone: '+7 (4872) 23-08-98',
        email: 'dshi4@tularegion.org',
        is_primary: false,
        is_decision_maker: true
      },
      {
        full_name: 'Ныркова Елизавета Сергеевна',
        position: 'Заместитель директора по АХЧ',
        phone: '+7 (4872) 23-08-98',
        email: 'dshi4@tularegion.org',
        is_primary: false,
        is_decision_maker: false
      },
      {
        full_name: 'Юдина Галина Александровна',
        position: 'Главный бухгалтер',
        phone: '+7 (4872) 23-08-98',
        email: 'dshi4@tularegion.org',
        is_primary: false,
        is_decision_maker: false
      }
    ]
  },
  {
    name: 'Тульский государственный театр кукол',
    legal_name: 'Государственное учреждение культуры Тульской области "Тульский государственный театр кукол"',
    short_name: 'ГУК ТО "Театр кукол"',
    company_type: 'gov',
    actual_address: 'ул. Советская, 62/15, Тула, 300000',
    phone: '+7 (4872) 75-25-45',
    email: 'teatrkukol@tularegion.ru',
    website: 'https://teatrkukol71.ru',
    notes: 'Билетная касса: +7(4872) 75-25-45. Коллективная заявка: +7(4872) 75-25-15. Учредитель: Министерство культуры Тульской области',
    contacts: [
      {
        full_name: 'Богородицкий Юрий Юрьевич',
        position: 'И.О. художественного руководителя',
        phone: '+7 (4872) 75-25-05',
        email: 'teatrkukol@tularegion.ru',
        is_primary: true,
        is_decision_maker: true
      },
      {
        full_name: 'Румянцева Ирина Всеволодовна',
        position: 'Начальник отдела по работе со зрителями',
        phone: '+7 (4872) 75-25-15',
        email: 'teatrkukol@tularegion.ru',
        is_primary: false,
        is_decision_maker: true
      }
    ]
  },
  {
    name: 'Детская музыкальная школа искусств № 6 г. Тулы',
    legal_name: 'Муниципальное бюджетное учреждение дополнительного образования «Детская музыкальная школа искусств № 6»',
    short_name: 'МБУДО ДМШИ № 6',
    company_type: 'school',
    actual_address: 'ул. Маршала Жукова, 8, Тула',
    phone: '+7 (4872) 239-17-22',
    email: '',
    website: '',
    notes: 'Детская музыкальная школа искусств',
    contacts: []
  },
  {
    name: 'Тульская областная детская музыкальная школа им. Г.З. Райхеля',
    legal_name: 'Государственное учреждение дополнительного образования Тульской области «Детская музыкальная школа имени Г.З. Райхеля»',
    short_name: 'ДМШ им. Райхеля',
    company_type: 'school',
    actual_address: 'пр. Ленина, 95а, Тула',
    phone: '+7 (4872) 35-21-87',
    email: '',
    website: '',
    notes: 'Областная музыкальная школа, названа в честь Г.З. Райхеля',
    contacts: []
  },
  {
    name: 'Тульский областной театр юного зрителя',
    legal_name: 'Государственное учреждение культуры Тульской области «Тульский областной театр юного зрителя»',
    short_name: 'ТЮЗ Тула',
    company_type: 'gov',
    actual_address: 'ул. Коминтерна, 2, Тула',
    phone: '+7 (4872) 56-97-66',
    email: '',
    website: '',
    notes: 'Областной театр юного зрителя',
    contacts: []
  },
  {
    name: 'Театр-студия "Зеркало"',
    legal_name: '',
    short_name: 'Студия Зеркало',
    company_type: 'other',
    actual_address: 'ул. Демидовская, 52, Тула',
    phone: '+7 (920) 783-89-82',
    email: '',
    website: '',
    notes: 'Частная детская театральная студия',
    contacts: []
  },
  {
    name: 'Театральная мастерская "Форма Свободы"',
    legal_name: '',
    short_name: 'Форма Свободы',
    company_type: 'other',
    actual_address: 'ул. Свободы, 37 к2, Тула',
    phone: '+7 (962) 272-22-10',
    email: '',
    website: '',
    notes: 'Театральная мастерская для детей и взрослых',
    contacts: []
  },
  {
    name: 'Модельно-артистическая школа "Прима"',
    legal_name: '',
    short_name: 'Школа Прима',
    company_type: 'other',
    actual_address: 'ул. Кирова, 135, Тула',
    phone: '+7 (910) 151-94-41',
    email: '',
    website: '',
    notes: 'Модельная и артистическая школа для детей',
    contacts: []
  },
  {
    name: 'Творческая студия "MUSE"',
    legal_name: '',
    short_name: 'Студия MUSE',
    company_type: 'other',
    actual_address: 'Красноармейский проспект, 7, Тула',
    phone: '+7 (920) 761-50-41',
    email: '',
    website: '',
    notes: 'Творческая студия для детей',
    contacts: []
  },
  {
    name: 'Детская школа искусств № 5 г. Тулы',
    legal_name: 'Муниципальное бюджетное учреждение дополнительного образования «Детская школа искусств № 5»',
    short_name: 'МБУДО ДШИ № 5',
    company_type: 'school',
    actual_address: 'Центральная ул., 1, посёлок Южный, Тула',
    phone: '',
    email: '',
    website: '',
    notes: 'Муниципальная школа искусств',
    contacts: []
  }
];

export async function POST(request: NextRequest) {
  try {
    // Use kstati schema for "Кстати театр" team
    const kstatiClient = createSchemaClient('kstati');
    
    // First, get or create Tula city
    let tulaCity: { id: string } | null = null;
    
    const { data: existingCity } = await kstatiClient
      .from('cities')
      .select('id')
      .eq('name', 'Тула')
      .single();
    
    if (existingCity) {
      tulaCity = existingCity;
    } else {
      const { data: newCity, error: cityError } = await kstatiClient
        .from('cities')
        .insert({ name: 'Тула', region: 'Тульская область', is_active: true })
        .select()
        .single();
      
      if (newCity) {
        tulaCity = newCity;
      } else {
        console.log('City create error:', cityError);
      }
    }

    // Get B2B pipeline and first stage
    let b2bPipelineId: string | null = null;
    let firstStageId: string | null = null;
    
    const { data: pipeline } = await kstatiClient
      .from('pipelines')
      .select('id')
      .eq('code', 'b2b')
      .single();
    
    if (pipeline) {
      b2bPipelineId = pipeline.id;
      
      const { data: stage } = await kstatiClient
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
      status: string; 
      company_id?: string;
      contacts_added?: number;
      deal_created?: boolean;
      error?: string 
    }> = [];

    for (const school of TULA_SCHOOLS) {
      try {
        // Check if company already exists
        const { data: existing } = await kstatiClient
          .from('companies')
          .select('id')
          .eq('name', school.name)
          .single();

        if (existing) {
          results.push({ name: school.name, status: 'already_exists', company_id: existing.id });
          continue;
        }

        // Insert company
        const { data: company, error: companyError } = await kstatiClient
          .from('companies')
          .insert({
            name: school.name,
            legal_name: school.legal_name || null,
            short_name: school.short_name || null,
            company_type: school.company_type,
            actual_address: school.actual_address,
            phone: school.phone || null,
            email: school.email || null,
            website: school.website || null,
            city_id: tulaCity?.id || null,
            notes: school.notes,
            status: 'active'
          })
          .select()
          .single();

        if (companyError) {
          results.push({ name: school.name, status: 'error', error: companyError.message });
          continue;
        }

        let contactsAdded = 0;
        let primaryContactId: string | null = null;

        // Add contacts
        if (school.contacts && school.contacts.length > 0 && company) {
          for (const contact of school.contacts) {
            const { data: contactData, error: contactError } = await kstatiClient
              .from('company_contacts')
              .insert({
                company_id: company.id,
                full_name: contact.full_name,
                position: contact.position,
                phone: contact.phone || null,
                email: contact.email || null,
                is_primary: contact.is_primary,
                is_decision_maker: contact.is_decision_maker
              })
              .select()
              .single();
            
            if (!contactError && contactData) {
              contactsAdded++;
              if (contact.is_primary) {
                primaryContactId = contactData.id;
              }
            }
          }
        }

        // Create B2B deal
        let dealCreated = false;
        if (b2bPipelineId && firstStageId && company) {
          const { error: dealError } = await kstatiClient
            .from('deals')
            .insert({
              company_id: company.id,
              contact_id: primaryContactId,
              pipeline_id: b2bPipelineId,
              stage_id: firstStageId,
              title: `B2B: ${school.short_name || school.name}`,
              amount: 0,
              is_b2b: true,
              status: 'active'
            });
          
          dealCreated = !dealError;
        }

        results.push({ 
          name: school.name, 
          status: 'created',
          company_id: company?.id,
          contacts_added: contactsAdded,
          deal_created: dealCreated
        });

      } catch (err: any) {
        results.push({ name: school.name, status: 'error', error: err.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'already_exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      team: 'Кстати театр',
      schema: 'kstati',
      city: tulaCity ? 'Тула' : 'not_created',
      pipeline: b2bPipelineId ? 'B2B' : 'not_found',
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
    schools: TULA_SCHOOLS,
    count: TULA_SCHOOLS.length,
    note: 'Данные из публичных источников (официальные сайты школ г. Тулы). Для добавления в CRM отправьте POST запрос.'
  });
}

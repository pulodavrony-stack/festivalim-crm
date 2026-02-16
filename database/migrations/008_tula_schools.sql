-- =============================================
-- Add 10 Tula Schools/Theaters to kstati schema
-- For team: Кстати театр
-- Data from official public websites
-- =============================================

-- 1. Create Tula city if not exists
INSERT INTO kstati.cities (name, region, is_active)
SELECT 'Тула', 'Тульская область', true
WHERE NOT EXISTS (SELECT 1 FROM kstati.cities WHERE name = 'Тула');

-- Get Tula city ID
DO $$
DECLARE
    v_tula_city_id UUID;
    v_b2b_pipeline_id UUID;
    v_first_stage_id UUID;
    v_client_id UUID;
BEGIN
    -- Get Tula city ID
    SELECT id INTO v_tula_city_id FROM kstati.cities WHERE name = 'Тула' LIMIT 1;
    
    -- Get B2B pipeline
    SELECT id INTO v_b2b_pipeline_id FROM kstati.pipelines WHERE code = 'b2b' LIMIT 1;
    
    -- Get first stage of B2B pipeline
    IF v_b2b_pipeline_id IS NOT NULL THEN
        SELECT id INTO v_first_stage_id 
        FROM kstati.pipeline_stages 
        WHERE pipeline_id = v_b2b_pipeline_id AND code = 'first_contact' 
        LIMIT 1;
    END IF;

    -- =============================================
    -- 1. ДШИ №4 г. Тулы - Уткин Сергей Николаевич
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, email, city_id, 
        client_type, status, notes
    ) VALUES (
        'Уткин Сергей Николаевич',
        '+7 (4872) 23-08-98',
        '74872230898',
        'dshi4@tularegion.org',
        v_tula_city_id,
        'lead',
        'new',
        '🏫 МБУДО ДШИ № 4 (Детская школа искусств №4)
📍 Адрес: ул. Гагарина (Косая Гора), 1, Тула, 300903
🌐 Сайт: https://dshi4-tula.ru
📞 Доп. телефон: +7 (4872) 77-03-74
⏰ Режим работы: пн-пт 9:00-20:00, сб 10:00-20:00

👥 Другие контакты:
• Агина Татьяна Сергеевна - Зам. директора по УВР, тел: +7 (4872) 23-08-98
• Ныркова Елизавета Сергеевна - Зам. директора по АХЧ
• Юдина Галина Александровна - Главный бухгалтер

📝 Работает с 1964 года. Муниципальное учреждение.'
    ) RETURNING id INTO v_client_id;
    
    -- Create B2B deal
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: ДШИ №4 г. Тулы', 0, 'active');
    END IF;

    -- =============================================
    -- 2. Тульский театр кукол - Богородицкий Юрий Юрьевич
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, email, city_id, 
        client_type, status, notes
    ) VALUES (
        'Богородицкий Юрий Юрьевич',
        '+7 (4872) 75-25-05',
        '74872752505',
        'teatrkukol@tularegion.ru',
        v_tula_city_id,
        'lead',
        'new',
        '🎭 ГУК ТО "Театр кукол"
📍 Адрес: ул. Советская, 62/15, Тула, 300000
🌐 Сайт: https://teatrkukol71.ru
📞 Билетная касса: +7(4872) 75-25-45
📞 Коллективные заявки: +7(4872) 75-25-15

👥 Другие контакты:
• Румянцева Ирина Всеволодовна - Начальник отдела по работе со зрителями, тел: +7(4872) 75-25-15

🏛 Учредитель: Министерство культуры Тульской области'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: Театр кукол', 0, 'active');
    END IF;

    -- =============================================
    -- 3. ДМШИ №6
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Директор ДМШИ №6',
        '+7 (4872) 239-17-22',
        '74872391722',
        v_tula_city_id,
        'lead',
        'new',
        '🎵 МБУДО ДМШИ № 6
📍 Адрес: ул. Маршала Жукова, 8, Тула

Детская музыкальная школа искусств'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: ДМШИ №6', 0, 'active');
    END IF;

    -- =============================================
    -- 4. ДМШ им. Райхеля
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Директор ДМШ им. Райхеля',
        '+7 (4872) 35-21-87',
        '74872352187',
        v_tula_city_id,
        'lead',
        'new',
        '🎵 ДМШ им. Г.З. Райхеля
📍 Адрес: пр. Ленина, 95а, Тула

Областная музыкальная школа, названа в честь Г.З. Райхеля'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: ДМШ им. Райхеля', 0, 'active');
    END IF;

    -- =============================================
    -- 5. ТЮЗ
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Директор ТЮЗ',
        '+7 (4872) 56-97-66',
        '74872569766',
        v_tula_city_id,
        'lead',
        'new',
        '🎭 ТЮЗ Тула
📍 Адрес: ул. Коминтерна, 2, Тула

Областной театр юного зрителя'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: ТЮЗ Тула', 0, 'active');
    END IF;

    -- =============================================
    -- 6. Театр-студия "Зеркало"
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Руководитель студии Зеркало',
        '+7 (920) 783-89-82',
        '79207838982',
        v_tula_city_id,
        'lead',
        'new',
        '🎭 Театр-студия "Зеркало"
📍 Адрес: ул. Демидовская, 52, Тула

Частная детская театральная студия'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: Студия Зеркало', 0, 'active');
    END IF;

    -- =============================================
    -- 7. Театральная мастерская "Форма Свободы"
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Руководитель "Форма Свободы"',
        '+7 (962) 272-22-10',
        '79622722210',
        v_tula_city_id,
        'lead',
        'new',
        '🎭 Театральная мастерская "Форма Свободы"
📍 Адрес: ул. Свободы, 37 к2, Тула

Театральная мастерская для детей и взрослых'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: Форма Свободы', 0, 'active');
    END IF;

    -- =============================================
    -- 8. Модельно-артистическая школа "Прима"
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Руководитель школы "Прима"',
        '+7 (910) 151-94-41',
        '79101519441',
        v_tula_city_id,
        'lead',
        'new',
        '💃 Модельно-артистическая школа "Прима"
📍 Адрес: ул. Кирова, 135, Тула

Модельная и артистическая школа для детей'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: Школа Прима', 0, 'active');
    END IF;

    -- =============================================
    -- 9. Творческая студия "MUSE"
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, phone, phone_normalized, city_id, 
        client_type, status, notes
    ) VALUES (
        'Руководитель студии "MUSE"',
        '+7 (920) 761-50-41',
        '79207615041',
        v_tula_city_id,
        'lead',
        'new',
        '🎨 Творческая студия "MUSE"
📍 Адрес: Красноармейский проспект, 7, Тула

Творческая студия для детей'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: Студия MUSE', 0, 'active');
    END IF;

    -- =============================================
    -- 10. ДШИ №5
    -- =============================================
    INSERT INTO kstati.clients (
        full_name, city_id, 
        client_type, status, notes
    ) VALUES (
        'Директор ДШИ №5',
        v_tula_city_id,
        'lead',
        'new',
        '🏫 МБУДО ДШИ № 5
📍 Адрес: Центральная ул., 1, посёлок Южный, Тула

Муниципальная школа искусств'
    ) RETURNING id INTO v_client_id;
    
    IF v_b2b_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL THEN
        INSERT INTO kstati.deals (client_id, pipeline_id, stage_id, title, amount, status)
        VALUES (v_client_id, v_b2b_pipeline_id, v_first_stage_id, 'B2B: ДШИ №5', 0, 'active');
    END IF;

    RAISE NOTICE '✅ Added 10 Tula schools/theaters to kstati schema';
    RAISE NOTICE 'City Tula ID: %', v_tula_city_id;
    RAISE NOTICE 'B2B Pipeline ID: %', v_b2b_pipeline_id;
    
END $$;

-- Verify results
SELECT 
    'kstati.clients' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE notes LIKE '%Тула%') as tula_count
FROM kstati.clients;

SELECT 
    'kstati.deals' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE title LIKE 'B2B:%') as b2b_count
FROM kstati.deals;

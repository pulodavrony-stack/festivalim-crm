-- =============================================
-- 007: Team Admins Setup
-- Добавляем роль team_admin и обновляем схему
-- =============================================

-- 1. Обновляем тип роли в менеджерах (добавляем team_admin если нужно)
-- В PostgreSQL нельзя просто добавить значение в enum,
-- поэтому проверяем constraint и обновляем если нужно

-- Удаляем старый constraint если есть
ALTER TABLE public.managers DROP CONSTRAINT IF EXISTS managers_role_check;

-- Добавляем новый constraint с team_admin
ALTER TABLE public.managers ADD CONSTRAINT managers_role_check 
CHECK (role IN ('admin', 'team_admin', 'rop', 'manager', 'marketer'));

-- 2. Проверяем/создаем колонки для multi-tenant
DO $$
BEGIN
    -- Добавляем team_id если нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'managers' 
                   AND column_name = 'team_id') THEN
        ALTER TABLE public.managers ADD COLUMN team_id UUID REFERENCES public.teams(id);
    END IF;
    
    -- Добавляем can_switch_teams если нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'managers' 
                   AND column_name = 'can_switch_teams') THEN
        ALTER TABLE public.managers ADD COLUMN can_switch_teams BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_managers_team_id ON public.managers(team_id);
CREATE INDEX IF NOT EXISTS idx_managers_role ON public.managers(role);

-- =============================================
-- ВАЖНО: Создание пользователей через API
-- =============================================
-- Для создания пользователей с аутентификацией нужно использовать
-- Supabase Auth Admin API. 
-- 
-- После выполнения этого SQL, вызовите API:
-- POST /api/admin/create-team-admins
--
-- Это создаст следующих администраторов:
-- 
-- | Имя              | Команда       | Email                   | Пароль       |
-- |------------------|---------------|-------------------------|--------------|
-- | Дарья Георги     | Кстати театр  | daria@kstati-teatr.ru   | Kstati2026!  |
-- | Георгий Гуторов  | ТФ Этажи      | georgiy@etazhi-tf.ru    | Etazhi2026!  |
-- | Игорь Туголуков  | ТФ Атлант     | igor@atlant-tf.ru       | Atlant2026!  |
-- =============================================

-- 4. Вывод информации
DO $$
DECLARE
    v_teams_count INTEGER;
    v_managers_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_teams_count FROM public.teams;
    SELECT COUNT(*) INTO v_managers_count FROM public.managers;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Схема обновлена!';
    RAISE NOTICE 'Команд: %', v_teams_count;
    RAISE NOTICE 'Менеджеров: %', v_managers_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Следующий шаг: вызовите API для создания админов';
    RAISE NOTICE 'POST /api/admin/create-team-admins';
    RAISE NOTICE '============================================';
END $$;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSchemaClient(schema: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }
  });
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^8(\d{10})$/, '7$1');
}

function firstPhone(phones: string): string {
  if (!phones) return '';
  const first = phones.split(';')[0].split(',')[0].trim();
  return first;
}

function firstEmail(emails: string): string {
  if (!emails) return '';
  const first = emails.split(';')[0].split(',')[0].trim();
  return first;
}

interface SchoolRecord {
  organization: string;
  director: string;
  phone: string;
  all_phones: string;
  email: string;
  all_emails: string;
  address: string;
  website: string;
  city: string;
  notes: string;
}

// ===== FILE 1: tula_schools_contacts.csv =====
const TULA_SCHOOLS_CONTACTS: SchoolRecord[] = [
  { organization: 'МБОУ ЦО №27', director: 'Маленьков Олег Игоревич', phone: '+7 950 923-18-79', all_phones: '+7 950 923-18-79; +7 487 221-63-85; +7 487 221-61-45', email: 'tula-co27@tularegion.org', all_emails: 'rishyha85@mail.ru; tula-co27@tularegion.org; mbouco27@lenta.ru', address: 'Тула', website: 'co27tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №15', director: 'Пучинская Любовь Валерьевна', phone: '+7 487 223-44-09', all_phones: '+7 487 223-44-09; +7 487 223-31-19; +7 958 570-54-22', email: 'tula-co15@tularegion.org', all_emails: 'mdou121tula@mail.ru; tula-co15@tularegion.org; shcool15tula@yandex.ru', address: 'Тула', website: 'chel-15.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №44', director: 'Трусова Майя Владимировна', phone: '+7 487 239-10-29', all_phones: '+7 487 239-10-29; +7 487 277-34-79; +7 487 230-48-10', email: 'tula-co44@tularegion.org', all_emails: 'geo-72008@yandex.ru; tula-co44@tularegion.org', address: 'Тула', website: 'school63.ucoz.net', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №7', director: 'Симонова Ирина Владимировна', phone: '+7 487 249-96-59', all_phones: '+7 487 249-96-59; +7 487 235-20-00; +7 487 241-01-22', email: 'tula-co7@tularegion.org', all_emails: 'tula-co7@tularegion.org; basovp@yandex.ru', address: 'Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №5', director: 'Широкая Елена Михайловна', phone: '+7 487 243-03-80', all_phones: '+7 487 243-03-80; +7 950 901-27-62; +7 487 249-53-50', email: 'tula-co5@tularegion.org', all_emails: 'tula-co5@tularegion.org; school-tula-52@yandex.ru', address: 'Тула', website: 'obrcen5.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №42 им. В.С. Гризодубовой', director: 'Кубанова Елена Николаевна', phone: '+7 487 235-38-44', all_phones: '+7 487 235-38-44; +7 909 260-98-20; +7 487 272-54-77', email: 'tula-co42@tularegion.org', all_emails: 'dragina66@mail.ru; ok71_89@mail.ru; tula-co42@tularegion.org', address: 'Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №32', director: 'Киселева Ирина Владимировна', phone: '+7 487 256-35-38', all_phones: '+7 487 256-35-38; +7 487 272-54-77; +7 487 222-45-80', email: 'tula-co32@tularegion.org', all_emails: 'tula-co32@tularegion.org; valentinasorok@yandwx.ru; mousosh13tula@mail.ru', address: 'Тула', website: 'co32tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО – Гимназия №1', director: 'Пономарев Алексей Васильевич', phone: '+7 487 244-35-33', all_phones: '+7 487 244-35-33; +7 487 244-35-67; +7 487 244-35-60', email: 'tula-g1@tularegion.org', all_emails: 'tula-g1@tularegion.org; pla-g1@tularegion.org; mou-g1@mail.ru', address: 'Тула', website: 'g1-tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №2', director: 'Гольдарб Ольга Леонидовна', phone: '+7 487 247-55-41', all_phones: '+7 487 247-55-41; +7 487 247-51-20; +7 487 239-38-35', email: 'tula-co2@tularegion.org', all_emails: 'tula-co2@tularegion.org; tula-sch1@mail.ru', address: 'Тула', website: 'co2tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №46', director: 'Жденев Игорь Викторович', phone: '+7 487 272-52-14', all_phones: '+7 487 272-52-14; +7 487 272-50-17; +7 487 241-20-37', email: 'tula-co46@tularegion.org', all_emails: 'tula-co46@tularegion.org; l_school_1@mail.ru', address: 'Тула', website: 'tulaschool54.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №33', director: 'Кузнецова Ольга Владимировна', phone: '+7 487 241-10-98', all_phones: '+7 487 241-10-98; +7 487 241-89-20; +7 487 241-14-20', email: 'co33@tularegion.org', all_emails: 'co33@tularegion.org; krissty70@gmail.com; tulashool64@mail.ru', address: 'Тула', website: 'co33tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №40', director: 'Гнидина Светлана Алексеевна', phone: '+7 487 248-12-25', all_phones: '+7 487 248-12-25; +7 487 248-67-13; +7 487 248-43-64', email: 'tula-co40@tularegion.org', all_emails: 'tula-co40@tularegion.org; school40tula@gmail.ru', address: 'Тула', website: 'co40tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №16', director: 'Леонов Дмитрий Алексеевич', phone: '+7 487 235-38-54', all_phones: '+7 487 235-38-54; +7 487 235-58-70; +7 930 899-62-40', email: 'tula-co16@tularegion.org', all_emails: 'tula-co16@tularegion.org; tulaschol54@mail.ru', address: 'Тула', website: 'tulacenter16.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №6', director: 'Максаков Станислав Андреевич', phone: '+7 487 223-65-56', all_phones: '+7 487 223-65-56; +7 487 224-36-83; +7 487 223-67-92', email: 'tula-co6@tularegion.org', all_emails: 'tula-co6@tularegion.org', address: 'Тула', website: 'co-6.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №10', director: 'Чернышова Ольга Николаевна', phone: '+7 487 234-97-94', all_phones: '+7 487 234-97-94; +7 487 234-00-63; +7 487 234-02-17', email: 'tula-co10@tularegion.org', all_emails: 'tula-co10@tularegion.org; sck_55_2@mail.ru', address: 'Тула', website: 'sch55tula.com', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО – Гимназия №11 им. Трояновских', director: 'Филина Олеся Николаевна', phone: '+7 487 236-32-55', all_phones: '+7 487 236-32-55; +7 487 236-38-74; +7 487 231-26-39', email: 'tula-co11@tularegion.org', all_emails: 'tula-co11@tularegion.org', address: 'Тула', website: 'co11tula.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №47', director: 'Еремеева Любовь Анатольевна', phone: '+7 920 786-60-17', all_phones: '+7 920 786-60-17; +7 487 272-19-35; +7 487 442-11-00', email: 'tula-co47@tularegion.org', all_emails: 'eremeeva.la@yandex.ru; tula-co47@tularegion.org', address: 'Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №34', director: 'Лазарева Людмила Викторовна', phone: '+7 487 221-95-98', all_phones: '+7 487 221-95-98; +7 487 222-34-25', email: 'tula-co34@tularegion.org', all_emails: 'tula-co34@tularegion.org', address: 'Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №9', director: 'Илясова Елена Михайловна', phone: '+7 487 224-27-34', all_phones: '+7 487 224-27-34; +7 487 224-24-76; +7 487 222-34-06', email: 'tula-co9@tularegion.org', all_emails: 'shkola9m@mail.ru; tula-co9@tularegion.org', address: 'Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №4', director: 'Степанов Евгений Юрьевич', phone: '+7 487 237-63-50', all_phones: '+7 487 237-63-50; +7 487 277-30-24; +7 487 277-32-94', email: 'tula-co4@tularegion.org', all_emails: 'mbouco4@mail.ru; tula-co4@tularegion.org', address: 'Тула', website: 'тула-цо4.рф', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №31', director: 'Лисицына Оксана Николаевна', phone: '+7 487 247-62-42', all_phones: '+7 487 247-62-42; +7 487 247-33-83; +7 487 247-54-60', email: 'tula-co31@tularegion.org', all_emails: 'tula-co31@tularegion.org; alenka5511@yandex.ru', address: 'Тула', website: 'centr31.edusite.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №13 им. Е.Н. Волкова', director: 'Кучина Людмила Анатольевна', phone: '+7 487 272-95-45', all_phones: '+7 487 272-95-45; +7 920 760-48-65', email: 'barsuki.shkola@tularegion.org', all_emails: 'barsuki.shkola@tularegion.org; barsuki.shkola@mail.ru', address: 'Тула', website: 'barsukisad.ru', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО №45', director: 'Гурова Юлия Николаевна', phone: '+7 487 245-53-39', all_phones: '+7 487 245-53-39; +7 487 245-57-74; +7 487 245-97-96', email: 'tula-co45@tularegion.org', all_emails: 'tula-co45@tularegion.org; school49.tula@yandex.ru', address: 'Тула', website: 'co45tula.ru', city: 'Тула', notes: '' },
];

// ===== FILE 3: Theater studios Kaluga/Tula =====
const THEATER_STUDIOS: SchoolRecord[] = [
  { organization: 'Калужский областной театр юного зрителя (детская студия)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Калуга', website: 'https://kalugatuz.ru', city: 'Калуга', notes: 'Работает с 1970 года' },
  { organization: 'Калужский театр кукол', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Калуга', website: 'https://puppet40.ru', city: 'Калуга', notes: '' },
  { organization: 'Театр-студия Антреприза', director: 'Михаил Коротин', phone: '', all_phones: '', email: '', all_emails: '', address: 'МБУ Молодёжный центр, Калуга', website: '', city: 'Калуга', notes: 'Режиссёр. На базе ГДК Малинники' },
  { organization: 'Арт-Студия Каморка', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Калуга', website: '', city: 'Калуга', notes: 'Группы 4-7 человек, 60 мин, возраст 6-15 лет' },
  { organization: 'Калужский областной драматический театр', director: 'Кривовичев А.А.', phone: '', all_phones: '', email: '', all_emails: '', address: 'Театральная пл., д.1, Калуга', website: 'https://teatrkaluga.ru', city: 'Калуга', notes: 'Директор' },
  { organization: 'Дом художественного творчества детей "Гармония"', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Калуга', website: '', city: 'Калуга', notes: 'Театральные студии' },
  { organization: 'Центр развития творчества детей и юношества "Созвездие"', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Калуга', website: '', city: 'Калуга', notes: 'Театральные студии' },
  { organization: 'Музыкальная школа (театральный кружок)', director: '', phone: '8 (960) 614-88-25', all_phones: '8 (960) 614-88-25, 8 (920) 740-61-61', email: '', all_emails: '', address: 'пр. Ленина, 87/3, Тула', website: '', city: 'Тула', notes: '350 ₽/занятие. Живопись, керамика, рисование' },
  { organization: 'Студия танцев (театральный кружок)', director: '', phone: '+7 (930) 899-99-07', all_phones: '+7 (930) 899-99-07, +7 (962) 275-39-00', email: '', all_emails: '', address: 'пр. Ленина, 85, Тула', website: '', city: 'Тула', notes: '300 ₽/занятие, 1700 ₽/месяц' },
  { organization: 'Дом детского творчества (театральный кружок)', director: '', phone: '+7 (915) 688-07-88', all_phones: '+7 (915) 688-07-88, +7 (977) 278-93-68', email: '', all_emails: '', address: 'ул. Советская, 12, Тула', website: '', city: 'Тула', notes: 'Обучение чтению' },
  { organization: 'Детский развивающий центр (театральный кружок)', director: '', phone: '+7 (920) 760-11-28', all_phones: '+7 (920) 760-11-28', email: '', all_emails: '', address: 'пр. Ленина, 127А, Тула', website: '', city: 'Тула', notes: '1500-2800 ₽. Подготовка к школе, репетиторство' },
  { organization: 'Студия творчества (театральный кружок)', director: '', phone: '8 (905) 621-35-88', all_phones: '8 (905) 621-35-88, 8 (4872) 35-52-33', email: '', all_emails: '', address: 'пр. Ленина, 116, Тула', website: '', city: 'Тула', notes: 'Вокал, рисование' },
];

// ===== FILE 2: Tula schools base (addresses only) =====
const TULA_SCHOOLS_BASE: SchoolRecord[] = [
  { organization: 'Частная музыкальная школа Нотика', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'пр. Ленина, 77, Тула', website: '', city: 'Тула', notes: 'Музыкальная школа' },
  { organization: 'МБОУ СОШ (ул. Свободы, 41)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Свободы, 41, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО (ул. Конструктора Грязева, 2)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Конструктора Грязева, 2, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (1-й пр. Металлургов, 7)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: '1-й пр. Металлургов, 7, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Галкина, 29)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Галкина, 29, Тула', website: '', city: 'Тула', notes: 'Бассейн, спортзал' },
  { organization: 'МБОУ (ул. Ленина, 21)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Ленина, 21, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'Лицей (ул. Галкина, 14)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Галкина, 14, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО (ул. Болдина, 100)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Болдина, 100, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Герцена, 50)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Герцена, 50, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (Перекопская ул., 2)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Перекопская ул., 2, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'Гимназия (ул. Галкина, 27)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Галкина, 27, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (Парковая ул., 4, Петелино)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Парковая ул., 4, посёлок Петелино', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (пос. Иншинский, 37)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'посёлок Иншинский, 37', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ ЦО (Литейная ул., 34)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Литейная ул., 34, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Пузакова, 12А)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Пузакова, 12А, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (Садовая ул., 2, Новое Павшино)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Садовая ул., 2, село Новое Павшино', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (пос. Рассвет, 44)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'посёлок Рассвет, 44', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (пос. Октябрьский, 90)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'посёлок Октябрьский, 90', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Свободы, 2)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Свободы, 2, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (Серебровская ул., 32)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'Серебровская ул., 32, Тула', website: '', city: 'Тула', notes: 'Детский сад' },
  { organization: 'МБОУ СОШ (ул. Софьи Перовской, 47)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Софьи Перовской, 47, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Баженова, 25)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Баженова, 25, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Максимовского, 2)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Максимовского, 2, Тула', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Героя России Макаровца, 1)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Героя России Макаровца, 1, село Осиновая Гора', website: '', city: 'Тула', notes: '' },
  { organization: 'МБОУ СОШ (ул. Жуковского, 27)', director: '', phone: '', all_phones: '', email: '', all_emails: '', address: 'ул. Жуковского, 27, Тула', website: '', city: 'Тула', notes: '' },
];

// ===== FILE 4: Kaluga region schools (ALL) =====
const KALUGA_SCHOOLS: SchoolRecord[] = [
  { organization: 'Лицей «Держава» г. Обнинска', director: 'Сергеева Марина Владимировна', phone: '+7 (48439) 6-39-71', all_phones: '+7 (48439) 6-39-71; Секретарь: +7 (48439) 6-39-72', email: 'derzhava_obninsk@mail.ru', all_emails: 'derzhava_obninsk@mail.ru', address: 'г. Обнинск, пр-т Ленина, д. 129', website: 'http://derzhava-obninsk.ru', city: 'Обнинск', notes: '~750 учеников. Завуч: Новикова Елена Петровна' },
  { organization: 'МБОУ «Гимназия № 9» г. Калуги', director: 'Кузнецова Ольга Михайловна', phone: '+7 (4842) 57-24-56', all_phones: '+7 (4842) 57-24-56; Секретарь: +7 (4842) 57-24-57', email: 'gymn9_kaluga@mail.ru', all_emails: 'gymn9_kaluga@mail.ru', address: 'г. Калуга, ул. Ленина, д. 45', website: 'http://gym9-kaluga.ru', city: 'Калуга', notes: '~750 учеников. Завуч: Сидорова Анна Викторовна' },
  { organization: 'МБОУ «Лицей № 36» г. Калуги', director: 'Иванова Марина Сергеевна', phone: '+7 (4842) 57-50-89', all_phones: '+7 (4842) 57-50-89; Приемная: +7 (4842) 57-50-90', email: 'liceum36_kaluga@mail.ru', all_emails: 'liceum36_kaluga@mail.ru', address: 'г. Калуга, ул. Ленина, д. 73', website: 'http://liceum36-kaluga.ru', city: 'Калуга', notes: '~850 учеников. Завуч: Смирнова Елена Александровна' },
  { organization: 'МБОУ «СОШ № 10» г. Калуги', director: '', phone: '+7 (4842) 55-82-17', all_phones: '+7 (4842) 55-82-17', email: 'school10_kaluga@mail.ru', all_emails: 'school10_kaluga@mail.ru', address: 'г. Калуга, ул. Социалистическая, д. 4', website: 'http://school10-kaluga.ru', city: 'Калуга', notes: '~600 учеников' },
  { organization: 'МБОУ «СОШ № 11» г. Калуги', director: '', phone: '+7 (4842) 55-39-84', all_phones: '+7 (4842) 55-39-84', email: 'school11_kaluga@mail.ru', all_emails: 'school11_kaluga@mail.ru', address: 'г. Калуга, ул. Больничная, д. 4', website: 'http://school11-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 12» г. Калуги', director: '', phone: '+7 (4842) 55-27-19', all_phones: '+7 (4842) 55-27-19', email: 'school12_kaluga@mail.ru', all_emails: 'school12_kaluga@mail.ru', address: 'г. Калуга, ул. Московская, д. 188', website: 'http://school12-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 13» г. Калуги', director: '', phone: '+7 (4842) 56-14-75', all_phones: '+7 (4842) 56-14-75', email: 'school13_kaluga@mail.ru', all_emails: 'school13_kaluga@mail.ru', address: 'г. Калуга, ул. Октябрьская, д. 20', website: 'http://school13-kaluga.ru', city: 'Калуга', notes: '~600 учеников' },
  { organization: 'МБОУ «СОШ № 14» г. Калуги', director: '', phone: '+7 (4842) 55-24-81', all_phones: '+7 (4842) 55-24-81', email: 'school14_kaluga@mail.ru', all_emails: 'school14_kaluga@mail.ru', address: 'г. Калуга, ул. Московская, д. 257', website: 'http://school14-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 15» г. Калуги', director: 'Белова Ирина Владимировна', phone: '+7 (4842) 72-49-41', all_phones: '+7 (4842) 72-49-41; Секретарь: +7 (4842) 72-49-42', email: 'school15_kaluga@mail.ru', all_emails: 'school15_kaluga@mail.ru', address: 'г. Калуга, ул. Никитина, д. 129', website: 'http://school15-kaluga.ru', city: 'Калуга', notes: '~800 учеников. Завуч: Козлова Марина Николаевна' },
  { organization: 'МБОУ «СОШ № 17» г. Калуги', director: '', phone: '+7 (4842) 55-57-43', all_phones: '+7 (4842) 55-57-43', email: 'school17_kaluga@mail.ru', all_emails: 'school17_kaluga@mail.ru', address: 'г. Калуга, ул. Кирова, д. 20', website: 'http://school17-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 18» г. Калуги', director: '', phone: '+7 (4842) 55-95-67', all_phones: '+7 (4842) 55-95-67', email: 'school18_kaluga@mail.ru', all_emails: 'school18_kaluga@mail.ru', address: 'г. Калуга, ул. Пухова, д. 52', website: 'http://school18-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 19» г. Калуги', director: '', phone: '+7 (4842) 72-33-24', all_phones: '+7 (4842) 72-33-24', email: 'school19_kaluga@mail.ru', all_emails: 'school19_kaluga@mail.ru', address: 'г. Калуга, ул. Хрустальная, д. 22', website: 'http://school19-kaluga.ru', city: 'Калуга', notes: '~600 учеников' },
  { organization: 'МБОУ «СОШ № 1» г. Калуги', director: 'Соколова Елена Викторовна', phone: '+7 (4842) 57-51-23', all_phones: '+7 (4842) 57-51-23; Секретарь: +7 (4842) 57-51-24', email: 'school1-kaluga@mail.ru', all_emails: 'school1-kaluga@mail.ru', address: 'г. Калуга, ул. Ленина, д. 71', website: 'http://school1-kaluga.ru', city: 'Калуга', notes: '~600 учеников. Завуч: Морозова Ирина Петровна' },
  { organization: 'МБОУ «СОШ № 2 им. М.Ф. Лукьянова» г. Калуги', director: '', phone: '+7 (4842) 55-42-78', all_phones: '+7 (4842) 55-42-78', email: 'school2_kaluga@mail.ru', all_emails: 'school2_kaluga@mail.ru', address: 'г. Калуга, ул. Суворова, д. 117', website: 'http://school2-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 20» г. Калуги', director: '', phone: '+7 (4842) 55-68-92', all_phones: '+7 (4842) 55-68-92', email: 'school20_kaluga@mail.ru', all_emails: 'school20_kaluga@mail.ru', address: 'г. Калуга, ул. Степана Разина, д. 65', website: 'http://school20-kaluga.ru', city: 'Калуга', notes: '~750 учеников' },
  { organization: 'МБОУ «СОШ № 21» г. Калуги', director: '', phone: '+7 (4842) 55-71-98', all_phones: '+7 (4842) 55-71-98', email: 'school21_kaluga@mail.ru', all_emails: 'school21_kaluga@mail.ru', address: 'г. Калуга, ул. Гагарина, д. 1/4', website: 'http://school21-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 22» г. Калуги', director: 'Орлова Светлана Анатольевна', phone: '+7 (4842) 74-51-48', all_phones: '+7 (4842) 74-51-48; Приемная: +7 (4842) 74-51-49', email: 'school22_kaluga@mail.ru', all_emails: 'school22_kaluga@mail.ru', address: 'г. Калуга, ул. Болдина, д. 14', website: 'http://school22-kaluga.ru', city: 'Калуга', notes: '~800 учеников. Завуч: Зайцева Ольга Ивановна' },
  { organization: 'МБОУ «СОШ № 23» г. Калуги', director: '', phone: '+7 (4842) 50-42-94', all_phones: '+7 (4842) 50-42-94', email: 'school23_kaluga@mail.ru', all_emails: 'school23_kaluga@mail.ru', address: 'г. Калуга, ул. Грабцевское шоссе, д. 107', website: 'http://school23-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 24» г. Калуги', director: '', phone: '+7 (4842) 75-31-85', all_phones: '+7 (4842) 75-31-85', email: 'school24_kaluga@mail.ru', all_emails: 'school24_kaluga@mail.ru', address: 'г. Калуга, ул. Глаголева, д. 3', website: 'http://school24-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 25» г. Калуги', director: '', phone: '+7 (4842) 74-85-37', all_phones: '+7 (4842) 74-85-37', email: 'school25_kaluga@mail.ru', all_emails: 'school25_kaluga@mail.ru', address: 'г. Калуга, ул. Терепецкая, д. 7', website: 'http://school25-kaluga.ru', city: 'Калуга', notes: '~600 учеников' },
  { organization: 'МБОУ «СОШ № 26» г. Калуги', director: '', phone: '+7 (4842) 57-65-44', all_phones: '+7 (4842) 57-65-44', email: 'school26_kaluga@mail.ru', all_emails: 'school26_kaluga@mail.ru', address: 'г. Калуга, ул. Дзержинского, д. 53', website: 'http://school26-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 27» г. Калуги', director: '', phone: '+7 (4842) 74-96-93', all_phones: '+7 (4842) 74-96-93', email: 'school27_kaluga@mail.ru', all_emails: 'school27_kaluga@mail.ru', address: 'г. Калуга, ул. Тульская, д. 3а', website: 'http://school27-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 28» г. Калуги', director: '', phone: '+7 (4842) 57-88-11', all_phones: '+7 (4842) 57-88-11', email: 'school28_kaluga@mail.ru', all_emails: 'school28_kaluga@mail.ru', address: 'г. Калуга, ул. Вишневского, д. 6', website: 'http://school28-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 29» г. Калуги', director: 'Григорьева Наталья Владимировна', phone: '+7 (4842) 54-85-71', all_phones: '+7 (4842) 54-85-71; Зам: +7 (4842) 54-85-72', email: 'school29_kaluga@mail.ru', all_emails: 'school29_kaluga@mail.ru', address: 'г. Калуга, ул. Генерала Попова, д. 9', website: 'http://school29-kaluga.ru', city: 'Калуга', notes: '~800 учеников. Завуч: Андреева Елена Сергеевна' },
  { organization: 'МБОУ «СОШ № 30» г. Калуги', director: '', phone: '+7 (4842) 55-48-26', all_phones: '+7 (4842) 55-48-26', email: 'school30_kaluga@mail.ru', all_emails: 'school30_kaluga@mail.ru', address: 'г. Калуга, ул. Суворова, д. 149', website: 'http://school30-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 31» г. Калуги', director: '', phone: '+7 (4842) 50-46-17', all_phones: '+7 (4842) 50-46-17', email: 'school31_kaluga@mail.ru', all_emails: 'school31_kaluga@mail.ru', address: 'г. Калуга, ул. Грабцевское шоссе, д. 42', website: 'http://school31-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 3» г. Калуги', director: '', phone: '+7 (4842) 56-28-91', all_phones: '+7 (4842) 56-28-91', email: 'school3_kaluga@mail.ru', all_emails: 'school3_kaluga@mail.ru', address: 'г. Калуга, ул. Октябрьская, д. 3', website: 'http://school3-kaluga.ru', city: 'Калуга', notes: '~500 учеников' },
  { organization: 'МБОУ «СОШ № 45» г. Калуги', director: '', phone: '+7 (4842) 57-16-02', all_phones: '+7 (4842) 57-16-02', email: 'school45_kaluga@mail.ru', all_emails: 'school45_kaluga@mail.ru', address: 'г. Калуга, ул. Ленина, д. 29', website: 'http://school45-kaluga.ru', city: 'Калуга', notes: '~750 учеников' },
  { organization: 'МБОУ «СОШ № 46» г. Калуги', director: '', phone: '+7 (4842) 50-06-77', all_phones: '+7 (4842) 50-06-77', email: 'school46_kaluga@mail.ru', all_emails: 'school46_kaluga@mail.ru', address: 'г. Калуга, ул. Маршала Жукова, д. 23', website: 'http://school46-kaluga.ru', city: 'Калуга', notes: '~800 учеников' },
  { organization: 'МБОУ «СОШ № 48» г. Калуги', director: '', phone: '+7 (4842) 55-94-48', all_phones: '+7 (4842) 55-94-48', email: 'school48_kaluga@mail.ru', all_emails: 'school48_kaluga@mail.ru', address: 'г. Калуга, ул. Пухова, д. 33', website: 'http://school48-kaluga.ru', city: 'Калуга', notes: '~600 учеников' },
  { organization: 'МБОУ «СОШ № 49» г. Калуги', director: '', phone: '+7 (4842) 55-01-83', all_phones: '+7 (4842) 55-01-83', email: 'school49_kaluga@mail.ru', all_emails: 'school49_kaluga@mail.ru', address: 'г. Калуга, ул. Поле Свободы, д. 127', website: 'http://school49-kaluga.ru', city: 'Калуга', notes: '~700 учеников' },
  { organization: 'МБОУ «СОШ № 4» г. Калуги', director: '', phone: '+7 (4842) 55-18-45', all_phones: '+7 (4842) 55-18-45', email: 'school4_kaluga@mail.ru', all_emails: 'school4_kaluga@mail.ru', address: 'г. Калуга, ул. Московская, д. 242', website: 'http://school4-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 50» г. Калуги', director: '', phone: '+7 (4842) 55-06-62', all_phones: '+7 (4842) 55-06-62', email: 'school50_kaluga@mail.ru', all_emails: 'school50_kaluga@mail.ru', address: 'г. Калуга, ул. Вилонова, д. 5', website: 'http://school50-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ «СОШ № 51» г. Калуги', director: '', phone: '+7 (4842) 74-98-49', all_phones: '+7 (4842) 74-98-49', email: 'school51_kaluga@mail.ru', all_emails: 'school51_kaluga@mail.ru', address: 'г. Калуга, ул. Азаровская, д. 3', website: 'http://school51-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 5» г. Калуги', director: 'Федорова Наталья Александровна', phone: '+7 (4842) 55-04-26', all_phones: '+7 (4842) 55-04-26; Зам по УВР: +7 (4842) 55-04-27', email: 'school5_kaluga@mail.ru', all_emails: 'school5_kaluga@mail.ru', address: 'г. Калуга, ул. Вилонова, д. 93', website: 'http://school5-kaluga.ru', city: 'Калуга', notes: '~800 учеников. Завуч: Петрова Светлана Николаевна' },
  { organization: 'МБОУ «СОШ № 6» г. Калуги', director: '', phone: '+7 (4842) 57-04-13', all_phones: '+7 (4842) 57-04-13', email: 'school6_kaluga@mail.ru', all_emails: 'school6_kaluga@mail.ru', address: 'г. Калуга, ул. Труда, д. 18', website: 'http://school6-kaluga.ru', city: 'Калуга', notes: '~550 учеников' },
  { organization: 'МБОУ «СОШ № 7» г. Калуги', director: 'Павлова Татьяна Ивановна', phone: '+7 (4842) 55-33-44', all_phones: '+7 (4842) 55-33-44; Секретарь: +7 (4842) 55-33-45', email: 'school7_kaluga@mail.ru', all_emails: 'school7_kaluga@mail.ru', address: 'г. Калуга, ул. Московская, д. 330', website: 'http://school7-kaluga.ru', city: 'Калуга', notes: '~900 учеников. Крупная школа. Завуч: Николаева Светлана Петровна' },
  { organization: 'МБОУ «СОШ № 8» г. Калуги', director: '', phone: '+7 (4842) 55-71-22', all_phones: '+7 (4842) 55-71-22', email: 'school8_kaluga@mail.ru', all_emails: 'school8_kaluga@mail.ru', address: 'г. Калуга, ул. Гагарина, д. 4', website: 'http://school8-kaluga.ru', city: 'Калуга', notes: '~650 учеников' },
  { organization: 'МБОУ СОШ № 1 г. Обнинска', director: 'Романова Ирина Петровна', phone: '+7 (48439) 6-16-75', all_phones: '+7 (48439) 6-16-75; Приемная: +7 (48439) 6-16-76', email: 'school1_obninsk@mail.ru', all_emails: 'school1_obninsk@mail.ru', address: 'г. Обнинск, пр-т Ленина, д. 103', website: 'http://school1-obninsk.ru', city: 'Обнинск', notes: '~800 учеников. Завуч: Семенова Ольга Викторовна' },
  { organization: 'МБОУ СОШ № 10 г. Обнинска', director: '', phone: '+7 (48439) 6-29-84', all_phones: '+7 (48439) 6-29-84', email: 'school10_obninsk@mail.ru', all_emails: 'school10_obninsk@mail.ru', address: 'г. Обнинск, ул. Гагарина, д. 20', website: 'http://school10-obninsk.ru', city: 'Обнинск', notes: '~700 учеников' },
  { organization: 'МБОУ СОШ № 13 г. Обнинска', director: '', phone: '+7 (48439) 6-58-92', all_phones: '+7 (48439) 6-58-92', email: 'school13_obninsk@mail.ru', all_emails: 'school13_obninsk@mail.ru', address: 'г. Обнинск, ул. Ленина, д. 228', website: 'http://school13-obninsk.ru', city: 'Обнинск', notes: '~650 учеников' },
  { organization: 'МБОУ СОШ № 4 г. Обнинска', director: 'Ковалева Светлана Александровна', phone: '+7 (48439) 6-42-36', all_phones: '+7 (48439) 6-42-36; Зам по ВР: +7 (48439) 6-42-37', email: 'school4_obninsk@mail.ru', all_emails: 'school4_obninsk@mail.ru', address: 'г. Обнинск, ул. Курчатова, д. 27', website: 'http://school4-obninsk.ru', city: 'Обнинск', notes: '~900 учеников. Завуч: Медведева Наталья Ивановна' },
  { organization: 'МКОУ СОШ д. Износки', director: '', phone: '+7 (48449) 3-17-46', all_phones: '+7 (48449) 3-17-46', email: 'school_iznoski@mail.ru', all_emails: 'school_iznoski@mail.ru', address: 'д. Износки, ул. Ленина, д. 62', website: 'http://school-iznoski.ru', city: 'Калужская обл.', notes: '~250 учеников' },
  { organization: 'МКОУ СОШ с. Бабынино', director: '', phone: '+7 (48448) 2-16-54', all_phones: '+7 (48448) 2-16-54', email: 'school_babynino@mail.ru', all_emails: 'school_babynino@mail.ru', address: 'с. Бабынино, ул. Советская, д. 7', website: 'http://school-babynino.ru', city: 'Калужская обл.', notes: '~280 учеников' },
  { organization: 'МКОУ СОШ с. Спас-Деменск', director: '', phone: '+7 (48455) 2-24-89', all_phones: '+7 (48455) 2-24-89', email: 'school_spas@mail.ru', all_emails: 'school_spas@mail.ru', address: 'с. Спас-Деменск, ул. Ленина, д. 28', website: 'http://school-spas.ru', city: 'Калужская обл.', notes: '~320 учеников' },
  { organization: 'МКОУ СОШ с. Ферзиково', director: '', phone: '+7 (48437) 3-19-72', all_phones: '+7 (48437) 3-19-72', email: 'school_ferzikovo@mail.ru', all_emails: 'school_ferzikovo@mail.ru', address: 'с. Ферзиково, ул. Ленина, д. 51', website: 'http://school-ferzikovo.ru', city: 'Калужская обл.', notes: '~300 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Киров', director: '', phone: '+7 (48456) 5-23-47', all_phones: '+7 (48456) 5-23-47', email: 'school1_kirov@mail.ru', all_emails: 'school1_kirov@mail.ru', address: 'г. Киров, ул. Ленина, д. 3', website: 'http://school1-kirov.ru', city: 'Калужская обл.', notes: '~550 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Козельск', director: '', phone: '+7 (48442) 2-15-64', all_phones: '+7 (48442) 2-15-64', email: 'school1_kozelsk@mail.ru', all_emails: 'school1_kozelsk@mail.ru', address: 'г. Козельск, ул. Большая Советская, д. 99', website: 'http://school1-kozelsk.ru', city: 'Калужская обл.', notes: '~550 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Людиново', director: '', phone: '+7 (48444) 6-29-44', all_phones: '+7 (48444) 6-29-44', email: 'school1_lyudinovo@mail.ru', all_emails: 'school1_lyudinovo@mail.ru', address: 'г. Людиново, ул. Ленина, д. 29', website: 'http://school1-lyudinovo.ru', city: 'Калужская обл.', notes: '~600 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Малоярославец', director: '', phone: '+7 (48431) 2-37-92', all_phones: '+7 (48431) 2-37-92', email: 'school1_maloyar@mail.ru', all_emails: 'school1_maloyar@mail.ru', address: 'г. Малоярославец, ул. Кутузова, д. 5', website: 'http://school1-maloyar.ru', city: 'Калужская обл.', notes: '~700 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Сухиничи', director: '', phone: '+7 (48451) 5-16-28', all_phones: '+7 (48451) 5-16-28', email: 'school1_sukhinichi@mail.ru', all_emails: 'school1_sukhinichi@mail.ru', address: 'г. Сухиничи, ул. Ленина, д. 67', website: 'http://school1-sukhinichi.ru', city: 'Калужская обл.', notes: '~500 учеников' },
  { organization: 'МКОУ СОШ № 1 г. Таруса', director: '', phone: '+7 (48435) 2-54-81', all_phones: '+7 (48435) 2-54-81', email: 'school1_tarusa@mail.ru', all_emails: 'school1_tarusa@mail.ru', address: 'г. Таруса, ул. Карла Либкнехта, д. 18', website: 'http://school1-tarusa.ru', city: 'Калужская обл.', notes: '~400 учеников' },
  { organization: 'МКОУ СОШ № 1 с. Перемышль', director: '', phone: '+7 (48441) 3-14-29', all_phones: '+7 (48441) 3-14-29', email: 'school1_peremyshl@mail.ru', all_emails: 'school1_peremyshl@mail.ru', address: 'с. Перемышль, ул. Советская, д. 14', website: 'http://school1-peremyshl.ru', city: 'Калужская обл.', notes: '~400 учеников' },
  { organization: 'МКОУ СОШ № 2 г. Малоярославец', director: '', phone: '+7 (48431) 2-19-84', all_phones: '+7 (48431) 2-19-84', email: 'school2_maloyar@mail.ru', all_emails: 'school2_maloyar@mail.ru', address: 'г. Малоярославец, ул. Ленина, д. 58', website: 'http://school2-maloyar.ru', city: 'Калужская обл.', notes: '~650 учеников' },
  { organization: 'МКОУ СОШ № 2 г. Таруса', director: '', phone: '+7 (48435) 2-67-39', all_phones: '+7 (48435) 2-67-39', email: 'school2_tarusa@mail.ru', all_emails: 'school2_tarusa@mail.ru', address: 'г. Таруса, ул. Розы Люксембург, д. 16', website: 'http://school2-tarusa.ru', city: 'Калужская обл.', notes: '~350 учеников' },
  { organization: 'МКОУ СОШ № 2 с. Перемышль', director: '', phone: '+7 (48441) 3-27-83', all_phones: '+7 (48441) 3-27-83', email: 'school2_peremyshl@mail.ru', all_emails: 'school2_peremyshl@mail.ru', address: 'с. Перемышль, ул. Ленина, д. 44', website: 'http://school2-peremyshl.ru', city: 'Калужская обл.', notes: '~350 учеников' },
  { organization: 'МКОУ СОШ № 3 г. Козельск', director: '', phone: '+7 (48442) 2-29-47', all_phones: '+7 (48442) 2-29-47', email: 'school3_kozelsk@mail.ru', all_emails: 'school3_kozelsk@mail.ru', address: 'г. Козельск, ул. Ленина, д. 17', website: 'http://school3-kozelsk.ru', city: 'Калужская обл.', notes: '~500 учеников' },
  { organization: 'МКОУ СОШ № 3 г. Людиново', director: '', phone: '+7 (48444) 6-16-73', all_phones: '+7 (48444) 6-16-73', email: 'school3_lyudinovo@mail.ru', all_emails: 'school3_lyudinovo@mail.ru', address: 'г. Людиново, ул. Свердлова, д. 16', website: 'http://school3-lyudinovo.ru', city: 'Калужская обл.', notes: '~550 учеников' },
  { organization: 'МКОУ СОШ № 3 г. Сухиничи', director: '', phone: '+7 (48451) 5-38-47', all_phones: '+7 (48451) 5-38-47', email: 'school3_sukhinichi@mail.ru', all_emails: 'school3_sukhinichi@mail.ru', address: 'г. Сухиничи, ул. Калужская, д. 23', website: 'http://school3-sukhinichi.ru', city: 'Калужская обл.', notes: '~450 учеников' },
  { organization: 'МКОУ СОШ № 4 г. Малоярославец', director: '', phone: '+7 (48431) 2-48-75', all_phones: '+7 (48431) 2-48-75', email: 'school4_maloyar@mail.ru', all_emails: 'school4_maloyar@mail.ru', address: 'г. Малоярославец, ул. Российских Газовиков, д. 13', website: 'http://school4-maloyar.ru', city: 'Калужская обл.', notes: '~800 учеников' },
  { organization: 'МКОУ СОШ № 5 г. Киров', director: '', phone: '+7 (48456) 5-47-92', all_phones: '+7 (48456) 5-47-92', email: 'school5_kirov@mail.ru', all_emails: 'school5_kirov@mail.ru', address: 'г. Киров, ул. Гагарина, д. 31', website: 'http://school5-kirov.ru', city: 'Калужская обл.', notes: '~600 учеников' },
  { organization: 'АНО «Православная гимназия им. Иоанна Кронштадтского»', director: '', phone: '+7 (4842) 56-91-23', all_phones: '+7 (4842) 56-91-23', email: 'pravoslavie_kaluga@mail.ru', all_emails: 'pravoslavie_kaluga@mail.ru', address: 'г. Калуга, ул. Достоевского, д. 52', website: 'http://pravgym-kaluga.ru', city: 'Калуга', notes: '~200 учеников. Частная. Религиозная гимназия' },
  { organization: 'Международная школа «Глобус»', director: '', phone: '+7 (4842) 55-67-89', all_phones: '+7 (4842) 55-67-89', email: 'globus_school@mail.ru', all_emails: 'globus_school@mail.ru', address: 'г. Калуга, ул. Московская, д. 156', website: 'http://globus-kaluga.ru', city: 'Калуга', notes: '~180 учеников. Частная. Международные программы' },
  { organization: 'НОУ «Школа Сотрудничества»', director: '', phone: '+7 (4842) 56-77-88', all_phones: '+7 (4842) 56-77-88', email: 'sotrudnichestvo@mail.ru', all_emails: 'sotrudnichestvo@mail.ru', address: 'г. Калуга, ул. Пушкина, д. 28', website: 'http://school-sotr-kaluga.ru', city: 'Калуга', notes: '~100 учеников. Частная. Углубленное изучение языков' },
  { organization: 'Частная школа «Интеллект»', director: '', phone: '+7 (4842) 59-87-65', all_phones: '+7 (4842) 59-87-65', email: 'intellect_school@mail.ru', all_emails: 'intellect_school@mail.ru', address: 'г. Калуга, ул. Кирова, д. 12', website: 'http://intellect-kaluga.ru', city: 'Калуга', notes: '~150 учеников. Частная' },
  { organization: 'Частная школа «Мир знаний» г. Обнинск', director: '', phone: '+7 (48439) 6-89-45', all_phones: '+7 (48439) 6-89-45', email: 'mirznanii_obninsk@mail.ru', all_emails: 'mirznanii_obninsk@mail.ru', address: 'г. Обнинск, ул. Курчатова, д. 56', website: 'http://mirznanii-obninsk.ru', city: 'Обнинск', notes: '~150 учеников. Частная школа наукограда' },
  { organization: 'Частная школа «Престиж»', director: '', phone: '+7 (4842) 59-45-32', all_phones: '+7 (4842) 59-45-32', email: 'prestige_school@mail.ru', all_emails: 'prestige_school@mail.ru', address: 'г. Калуга, ул. Ленина, д. 55', website: 'http://prestige-kaluga.ru', city: 'Калуга', notes: '~120 учеников. Частная. Элитная школа' },
];

const ALL_SCHOOLS = [
  ...TULA_SCHOOLS_CONTACTS,
  ...TULA_SCHOOLS_BASE,
  ...THEATER_STUDIOS,
  ...KALUGA_SCHOOLS,
];

export async function POST(request: NextRequest) {
  try {
    const kstati = createSchemaClient('kstati');
    
    // Create cities
    const cityNames = [...new Set(ALL_SCHOOLS.map(s => s.city).filter(Boolean))];
    const cityMap: Record<string, string> = {};
    
    for (const cityName of cityNames) {
      const { data: existing } = await kstati.from('cities').select('id').eq('name', cityName).single();
      if (existing) {
        cityMap[cityName] = existing.id;
      } else {
        const { data: created } = await kstati.from('cities').insert({ name: cityName, is_active: true }).select().single();
        if (created) cityMap[cityName] = created.id;
      }
    }

    // Get B2B pipeline
    let b2bPipelineId: string | null = null;
    let firstStageId: string | null = null;
    const { data: pipeline } = await kstati.from('pipelines').select('id').eq('code', 'b2b').single();
    if (pipeline) {
      b2bPipelineId = pipeline.id;
      const { data: stage } = await kstati.from('pipeline_stages').select('id').eq('pipeline_id', b2bPipelineId).eq('code', 'first_contact').single();
      if (stage) firstStageId = stage.id;
    }

    const results: Array<{ org: string; status: string; error?: string }> = [];

    for (const school of ALL_SCHOOLS) {
      try {
        // Deduplicate by phone
        if (school.phone) {
          const norm = normalizePhone(school.phone);
          if (norm.length >= 10) {
            const { data: dup } = await kstati.from('clients').select('id').eq('phone_normalized', norm).single();
            if (dup) {
              results.push({ org: school.organization, status: 'duplicate_phone' });
              continue;
            }
          }
        }

        // Build notes with all info
        const noteParts: string[] = [];
        noteParts.push(`🏫 ${school.organization}`);
        if (school.address) noteParts.push(`📍 ${school.address}`);
        if (school.website) noteParts.push(`🌐 ${school.website}`);
        if (school.all_phones && school.all_phones !== school.phone) noteParts.push(`📞 Все телефоны: ${school.all_phones}`);
        if (school.all_emails && school.all_emails !== school.email) noteParts.push(`📧 Все email: ${school.all_emails}`);
        if (school.notes) noteParts.push(`📝 ${school.notes}`);

        const clientName = school.director || `Директор ${school.organization}`;
        const ph = school.phone || firstPhone(school.all_phones);
        const em = school.email || firstEmail(school.all_emails);

        const { data: client, error: clientError } = await kstati
          .from('clients')
          .insert({
            full_name: clientName,
            phone: ph || null,
            phone_normalized: ph ? normalizePhone(ph) : null,
            email: em || null,
            city_id: cityMap[school.city] || null,
            client_type: 'lead',
            status: 'new',
            notes: noteParts.join('\n'),
          })
          .select()
          .single();

        if (clientError) {
          results.push({ org: school.organization, status: 'error', error: clientError.message });
          continue;
        }

        // Create B2B deal
        if (b2bPipelineId && firstStageId && client) {
          await kstati.from('deals').insert({
            client_id: client.id,
            pipeline_id: b2bPipelineId,
            stage_id: firstStageId,
            title: `B2B: ${school.organization}`,
            amount: 0,
            is_b2b: true,
            status: 'active',
          });
        }

        results.push({ org: school.organization, status: 'created' });
      } catch (err: any) {
        results.push({ org: school.organization, status: 'error', error: err.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const duplicates = results.filter(r => r.status === 'duplicate_phone').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      cities: cityMap,
      pipeline: b2bPipelineId ? 'B2B found' : 'not found',
      summary: { total: ALL_SCHOOLS.length, created, duplicates, errors },
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    total: ALL_SCHOOLS.length,
    breakdown: {
      tula_schools_contacts: TULA_SCHOOLS_CONTACTS.length,
      tula_schools_base: TULA_SCHOOLS_BASE.length,
      theater_studios: THEATER_STUDIOS.length,
      kaluga_schools: KALUGA_SCHOOLS.length,
    },
  });
}

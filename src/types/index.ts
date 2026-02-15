// =============================================
// ФЕСТИВАЛИМ CRM: TypeScript Types
// =============================================

export * from './b2b';
export * from './team';

// =============================================
// ENUMS
// =============================================

export type ManagerRole = 'admin' | 'rop' | 'manager' | 'marketer';
export type Branch = 'atlant' | 'etazhi';

// Типы клиентов (ключевое!)
export type ClientType = 'lead' | 'pk' | 'kb';
export const ClientTypeLabels: Record<ClientType, string> = {
  lead: 'Лид',
  pk: 'ПК',
  kb: 'КБ',
};

export type ClientStatus = 
  | 'new' 
  | 'in_progress' 
  | 'callback' 
  | 'not_available' 
  | 'interested'
  | 'active' 
  | 'vip' 
  | 'inactive' 
  | 'blacklist';

export type PriceRange = 'economy' | 'standard' | 'premium' | 'any';
export type DealStatus = 'active' | 'won' | 'lost';
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'answered' | 'missed' | 'busy' | 'failed' | 'voicemail';
export type MessageChannel = 'whatsapp' | 'telegram' | 'vk' | 'sms';
export type MessageDirection = 'inbound' | 'outbound';
export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker';
export type TaskType = 'call' | 'message' | 'meeting' | 'other';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventStatus = 'planned' | 'on_sale' | 'sold_out' | 'completed' | 'cancelled';
export type SourceType = 'landing' | 'telegram' | 'whatsapp' | 'vk' | 'call' | 'partner' | 'other';

export type ActivityType = 
  | 'note'
  | 'call_inbound'
  | 'call_outbound'
  | 'message_inbound'
  | 'message_outbound'
  | 'stage_change'
  | 'type_change'
  | 'deal_created'
  | 'deal_won'
  | 'deal_lost'
  | 'task_created'
  | 'task_completed'
  | 'client_created'
  | 'manager_assigned';

// =============================================
// СПРАВОЧНИКИ
// =============================================

export interface City {
  id: string;
  name: string;
  region?: string;
  timezone: string;
  is_active: boolean;
  sort_order: number;
}

export interface Genre {
  id: string;
  name: string;
  icon?: string;
}

export interface LeadSource {
  id: string;
  name: string;
  code: string;
  source_type: SourceType;
  tilda_page_id?: string;
  landing_url?: string;
  default_utm_source?: string;
  default_utm_medium?: string;
  default_utm_campaign?: string;
  is_active: boolean;
  created_at: string;
}

// =============================================
// ПОЛЬЗОВАТЕЛИ
// =============================================

export interface Manager {
  id: string;
  auth_user_id?: string;
  email: string;
  full_name: string;
  phone?: string;
  role: ManagerRole;
  branch?: Branch;
  cities_ids?: string[];
  is_active: boolean;
  weekly_calls_target: number;
  weekly_sales_target: number;
  has_b2c_access: boolean;
  has_b2b_access: boolean;
  // Multi-tenant
  team_id?: string;
  can_switch_teams: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// СПЕКТАКЛИ И СОБЫТИЯ
// =============================================

export interface Show {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  age_restriction?: string;
  genre_ids?: string[];
  poster_url?: string;
  trailer_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  show_id: string;
  city_id: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  landing_source_id?: string;
  landing_url?: string;
  total_tickets?: number;
  sold_tickets: number;
  min_price?: number;
  max_price?: number;
  status: EventStatus;
  sales_start_date?: string;
  sales_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EventFull extends Event {
  show?: Show;
  city?: City;
  landing_source?: LeadSource;
}

// =============================================
// КЛИЕНТЫ
// =============================================

export interface Client {
  id: string;
  full_name: string;
  phone?: string;
  phone_normalized?: string;
  email?: string;
  city_id?: string;
  
  // Тип клиента
  client_type: ClientType;
  status: ClientStatus;
  
  // Предпочтения
  preferred_genres?: string[];
  preferred_price_range?: PriceRange;
  survey_answers?: Record<string, any>;
  
  // Мессенджеры
  telegram_id?: number;
  telegram_username?: string;
  telegram_chat_id?: number;
  whatsapp_phone?: string;
  whatsapp_id?: string;
  vk_id?: number;
  
  // Источник
  source_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  
  // Менеджер
  manager_id?: string;
  
  // Статистика
  total_purchases: number;
  total_revenue: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  last_contact_date?: string;
  
  // История типа
  became_pk_at?: string;
  became_kb_at?: string;
  
  notes?: string;
  
  // Точки отказа (для VIP системы)
  rejection_points: number;
  
  // Последняя активность
  last_activity_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ClientFull extends Client {
  city?: City;
  source?: LeadSource;
  manager?: Manager;
  genres?: Genre[];
  deals?: Deal[];
  calls?: Call[];
  messages?: Message[];
  activities?: Activity[];
  tags?: Tag[];
  pitches?: ClientPitch[];
}

// Результат проверки дубликата
export interface DuplicateCheckResult {
  id: string;
  full_name: string;
  client_type: ClientType;
  total_purchases: number;
}

// =============================================
// ВОРОНКИ
// =============================================

export interface Pipeline {
  id: string;
  name: string;
  code: string;
  client_type?: ClientType;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  code: string;
  color: string;
  sort_order: number;
  is_final: boolean;
  is_success: boolean;
  auto_transition_to?: ClientType;
  created_at: string;
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

// =============================================
// СДЕЛКИ
// =============================================

export interface Deal {
  id: string;
  client_id?: string;
  manager_id?: string;
  event_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  source_id?: string;
  title?: string;
  tickets_count: number;
  amount: number;
  discount_percent: number;
  discount_amount: number;
  status: DealStatus;
  lost_reason?: string;
  next_contact_date?: string;
  closed_at?: string;
  report_week_start?: string;
  created_at: string;
  updated_at: string;
}

export interface DealFull extends Deal {
  client?: Client;
  manager?: Manager;
  event?: EventFull;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  source?: LeadSource;
  tasks?: Task[];
  activities?: Activity[];
}

// =============================================
// ЗВОНКИ
// =============================================

export interface Call {
  id: string;
  client_id?: string;
  deal_id?: string;
  manager_id?: string;
  uis_call_id?: string;
  direction: CallDirection;
  phone: string;
  phone_normalized?: string;
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds: number;
  wait_seconds: number;
  status: CallStatus;
  record_url?: string;
  result?: string;
  notes?: string;
  report_date?: string;
  created_at: string;
}

export interface CallFull extends Call {
  client?: Client;
  deal?: Deal;
  manager?: Manager;
}

// =============================================
// СООБЩЕНИЯ
// =============================================

export interface Message {
  id: string;
  client_id: string;
  manager_id?: string;
  deal_id?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  external_id?: string;
  content?: string;
  content_type: ContentType;
  media_url?: string;
  delivery_status?: 'sent' | 'delivered' | 'read' | 'failed';
  ai_sentiment?: 'positive' | 'neutral' | 'negative';
  ai_intent?: string;
  ai_suggested_reply?: string;
  template_id?: string;
  created_at: string;
}

export interface MessageFull extends Message {
  client?: Client;
  manager?: Manager;
  deal?: Deal;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel | 'all';
  category?: string;
  content: string;
  variables?: string[];
  waba_template_name?: string;
  waba_template_status?: string;
  is_active: boolean;
  created_at: string;
}

// =============================================
// ЗАДАЧИ
// =============================================

export interface Task {
  id: string;
  client_id?: string;
  deal_id?: string;
  event_id?: string;
  manager_id?: string;
  created_by?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  due_date: string;
  completed_at?: string;
  is_completed: boolean;
  is_auto: boolean;
  auto_source?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFull extends Task {
  client?: Client;
  deal?: Deal;
  event?: EventFull;
  manager?: Manager;
  created_by_manager?: Manager;
}

// =============================================
// АКТИВНОСТЬ
// =============================================

export interface Activity {
  id: string;
  client_id?: string;
  deal_id?: string;
  manager_id?: string;
  call_id?: string;
  message_id?: string;
  activity_type: ActivityType;
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ActivityFull extends Activity {
  manager?: Manager;
  call?: Call;
  message?: Message;
}

// =============================================
// АНАЛИТИКА
// =============================================

export interface ManagerDailyStats {
  id: string;
  manager_id: string;
  stat_date: string;
  calls_total: number;
  calls_answered: number;
  calls_duration_total: number;
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  revenue: number;
  tickets_sold: number;
  messages_sent: number;
  messages_received: number;
  tasks_completed: number;
  tasks_overdue: number;
  conversion_lead_to_deal?: number;
  conversion_deal_to_sale?: number;
}

export interface ManagerWeeklyStats {
  manager_id: string;
  full_name: string;
  week_start: string;
  calls_total: number;
  calls_answered: number;
  deals_won: number;
  revenue: number;
  weekly_calls_target: number;
  weekly_sales_target: number;
  calls_progress: number;
  sales_progress: number;
}

export interface SourceStats {
  source_id: string;
  source_name: string;
  stat_date: string;
  leads_count: number;
  deals_count: number;
  won_count: number;
  revenue: number;
  conversion_to_deal?: number;
  conversion_to_sale?: number;
  ad_spend?: number;
  cost_per_lead?: number;
  roi?: number;
}

export interface PipelineConversion {
  pipeline_id: string;
  pipeline_name: string;
  stage_id: string;
  stage_name: string;
  sort_order: number;
  deals_count: number;
  deals_amount: number;
  stage_percentage: number;
}

// =============================================
// ТЕГИ
// =============================================

export type TagCategory = 'event' | 'status' | 'custom' | 'vip';

export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: TagCategory;
  is_auto: boolean;
  event_id?: string;
  city_id?: string;
  created_at: string;
}

export interface ClientTag {
  client_id: string;
  tag_id: string;
  created_at: string;
  created_by?: string;
  tag?: Tag;
}

// =============================================
// ПИЧИНГ СПЕКТАКЛЕЙ
// =============================================

export interface ClientPitch {
  id: string;
  client_id: string;
  event_id: string;
  manager_id?: string;
  created_at: string;
  event?: EventFull;
  manager?: Manager;
}

// =============================================
// РАСПРЕДЕЛЕНИЕ ЛИДОВ
// =============================================

export interface LeadRoutingRule {
  id: string;
  city_id: string;
  event_id?: string;
  manager_id: string;
  is_active: boolean;
  priority: number;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
  updated_at: string;
  city?: City;
  event?: EventFull;
  manager?: Manager;
}

// =============================================
// НАПОМИНАНИЯ
// =============================================

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type ReminderChannel = 'whatsapp' | 'sms' | 'telegram';

export interface Reminder {
  id: string;
  client_id: string;
  event_id: string;
  remind_at: string;
  channel?: ReminderChannel;
  message_template_id?: string;
  status: ReminderStatus;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  client?: Client;
  event?: EventFull;
}

// =============================================
// API INPUT TYPES
// =============================================

export interface CreateClientInput {
  full_name: string;
  phone?: string;
  email?: string;
  city_id?: string;
  client_type?: ClientType;
  source_id?: string;
  manager_id?: string;
  telegram_id?: number;
  telegram_username?: string;
  whatsapp_phone?: string;
  preferred_genres?: string[];
  preferred_price_range?: PriceRange;
  survey_answers?: Record<string, any>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  notes?: string;
}

export interface CreateDealInput {
  client_id: string;
  manager_id?: string;
  event_id?: string;
  pipeline_id: string;
  stage_id: string;
  source_id?: string;
  title?: string;
  tickets_count?: number;
  amount?: number;
  discount_percent?: number;
}

export interface CreateEventInput {
  show_id: string;
  city_id: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  landing_url?: string;
  total_tickets?: number;
  min_price?: number;
  max_price?: number;
}

export interface SendMessageInput {
  client_id: string;
  channel: MessageChannel;
  content: string;
  template_id?: string;
  deal_id?: string;
}

// =============================================
// WEBHOOK TYPES
// =============================================

// Тильда вебхук
export interface TildaWebhook {
  Name?: string;
  Phone?: string;
  Email?: string;
  formid?: string;
  formname?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  [key: string]: any;
}

// UIS вебхук
export interface UISCallWebhook {
  call_id: string;
  direction: 'in' | 'out';
  caller_id: string;
  called_id: string;
  employee_id?: string;
  employee_name?: string;
  start_time: string;
  answer_time?: string;
  end_time?: string;
  duration: number;
  wait_duration?: number;
  status: string;
  record_url?: string;
}

// Telegram Bot вебхук
export interface TelegramBotWebhook {
  type: 'new_lead' | 'survey_completed' | 'message';
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  message?: string;
  survey_answers?: Record<string, any>;
  show_interest?: string;
}

// WABA вебхук
export interface WABAWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string; display_phone_number: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// =============================================
// FILTERS
// =============================================

export type FilterLogic = 'and' | 'or';

export interface ClientFilters {
  search?: string;
  client_type?: ClientType;
  status?: ClientStatus;
  city_id?: string;
  manager_id?: string;
  source_id?: string;
  has_purchases?: boolean;
  genre_ids?: string[];
  created_from?: string;
  created_to?: string;
  // Новые фильтры
  event_ids?: string[]; // по спектаклям, на которых был клиент
  tag_ids?: string[]; // по тегам
  last_activity_from?: string; // по последней активности
  last_activity_to?: string;
  last_call_from?: string; // по последнему звонку
  last_call_to?: string;
  filter_logic?: FilterLogic; // И/ИЛИ логика
}

export interface DealFilters {
  search?: string;
  status?: DealStatus;
  pipeline_id?: string;
  stage_id?: string;
  manager_id?: string;
  event_id?: string;
  city_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface EventFilters {
  show_id?: string;
  city_id?: string;
  status?: EventStatus;
  date_from?: string;
  date_to?: string;
}

export interface Pagination {
  page: number;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

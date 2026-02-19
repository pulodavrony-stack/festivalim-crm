import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getOrgotdelClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'orgotdel' },
  });
}

export type Event = {
  id: string;
  title: string;
  city: string;
  hall: string;
  date: string;
  description?: string;
  status: 'negotiating' | 'signing' | 'signed';
  contract_date?: string;
  responsible_department?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
};

export type Draft = {
  id: string;
  show_id?: string;
  show_title: string;
  hall_id?: string;
  hall_name: string;
  city_name: string;
  date: string;
  status: 'negotiating' | 'signing' | 'signed';
  published_event_id?: string;
  notes?: string;
  created_at?: string;
};

export type City = {
  id: string;
  name: string;
  timezone: string;
  priority: number;
  min_weeks: number;
  max_weeks: number;
  min_weeks_summer: number;
  max_weeks_summer: number;
  office: string;
};

export type Hall = {
  id: string;
  name: string;
  city_id: string;
  address?: string;
  capacity?: number;
  comments?: string;
  city?: City;
};

export type VenueDetails = {
  id: string;
  hall_id: string;
  rental_cost?: number;
  prepayment_amount?: number;
  prepayment_days_after_contract?: number;
  final_payment_amount?: number;
  final_payment_days_before_event?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_telegram?: string;
  contact_whatsapp?: string;
};

export type Show = {
  id: string;
  title: string;
  rating?: string;
};

export type ShowDetails = {
  id: string;
  show_id: string;
  fee_amount?: number;
  fee_prepayment_amount?: number;
  fee_prepayment_days_after_contract?: number;
  fee_final_amount?: number;
  fee_final_days_before_event?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_telegram?: string;
  contact_whatsapp?: string;
  notes?: string;
};

export type PaymentEvent = {
  id: string;
  event_id: string;
  payment_type: 'prepayment' | 'final' | 'fee_prepayment' | 'fee_final';
  due_date: string;
  amount?: number;
  payment_method?: 'bank_transfer' | 'cash';
  is_paid: boolean;
  paid_at?: string;
  created_at?: string;
  event?: Event;
};

export type Task = {
  id: string;
  title: string;
  purpose?: string;
  measurement?: string;
  due_date?: string;
  assignee_id?: string;
  department?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  link?: string;
  comments?: string;
  related_event_id?: string;
  created_by_id?: string;
  created_at?: string;
  completed_at?: string;
};

export type PlanningItem = {
  id: string;
  year_month: string;
  row_number: number;
  date?: string;
  city_name?: string;
  hall_name?: string;
  show_title?: string;
  time?: string;
  notes?: string;
  draft_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MonthComment = {
  id: string;
  year_month: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
};

export type AvailableDate = {
  id: string;
  type: 'show' | 'hall';
  show_title?: string;
  hall_name?: string;
  city_name?: string;
  date: string;
  notes?: string;
  created_at?: string;
};

export type Notification = {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at?: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  ckp?: string;
  metrics?: string;
  kfu?: string;
  head_position?: string;
};

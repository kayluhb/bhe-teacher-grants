import type {Role} from '~/lib/auth';
import type {BenefitScope} from '~/lib/grant-application';
import type {GrantStatus} from '~/lib/status';

export type GrantItemInput = {
  asin?: string | null;
  item_description: string;
  quantity: number;
  quote_r2_key?: string | null;
  source?: 'WISHLIST' | 'MANUAL';
  unit_price: number;
  vendor_url?: string | null;
};

export type GrantRow = {
  actual_amount: number | null;
  approved_amount: number | null;
  benefit_scope: BenefitScope;
  cycle_id: string;
  delivered_at: string | null;
  grade_level_subject: string;
  id: string;
  impact_statement: string;
  proof_of_delivery_r2_key: string | null;
  purchased_at: string | null;
  receipt_r2_key: string | null;
  rejection_reason: string | null;
  requested_amount: number;
  semester: 'FALL' | 'SPRING';
  school_year: string;
  school_year_id: string;
  status: GrantStatus;
  teacher_email: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  tracking_number: string | null;
  variance_note: string | null;
  vendor_name: string | null;
  wishlist_url: string | null;
};

export type GrantItemRow = {
  actual_description: string | null;
  actual_quantity: number | null;
  actual_total_price: number | null;
  actual_unit_price: number | null;
  asin: string | null;
  id: string;
  is_ad_hoc: number;
  item_description: string;
  item_status: string;
  quantity: number;
  quote_r2_key: string | null;
  source: 'WISHLIST' | 'MANUAL';
  total_price: number;
  unit_price: number;
  variance_note: string | null;
  vendor_url: string | null;
};

export type CycleRow = {
  budget_limit: number;
  ends_at: string;
  id: string;
  is_active: number;
  name: string;
  review_ends_at: string | null;
  review_opened_notified_at: string | null;
  review_starts_at: string | null;
  school_year: string;
  school_year_id: string;
  semester: 'FALL' | 'SPRING';
  starts_at: string;
};

export type Result<T> = {error: string} | T;

export type Actor = {id: string; role: Role};

export type UserRole = "system_admin" | "agency_user";
export type ApplicationStatus =
  | "completed"
  | "released"
  | "authorized"
  | "pending"
  | "rejected";
export type AgencyRank = "rank_2" | "rank_3" | "rank_4";
export type FormTab =
  | "affiliation_check"
  | "million_special"
  | "streaming_auth"
  | "subscription_cancel"
  | "account_id_change"
  | "event_build"
  | "special_referral"
  | "objection";
export type RevenueTask =
  | "task_1"
  | "task_2"
  | "task_3"
  | "task_4"
  | "task_5"
  | "task_6_plus";
export type AccountType = "futsu" | "toza";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          agency_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          agency_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          agency_id?: string | null;
          created_at?: string;
        };
      };
      agencies: {
        Row: {
          id: string;
          name: string;
          commission_rate: number;
          rank: AgencyRank | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
          invoice_registration_number: string | null;
          company_address: string | null;
          representative_name: string | null;
          bank_name: string | null;
          bank_branch: string | null;
          bank_account_type: AccountType | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          commission_rate?: number;
          rank?: AgencyRank | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          invoice_registration_number?: string | null;
          company_address?: string | null;
          representative_name?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: AccountType | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          commission_rate?: number;
          rank?: AgencyRank | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          invoice_registration_number?: string | null;
          company_address?: string | null;
          representative_name?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: AccountType | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
        };
      };
      agency_hierarchy: {
        Row: {
          agency_id: string;
          parent_agency_id: string;
        };
        Insert: {
          agency_id: string;
          parent_agency_id: string;
        };
        Update: {
          agency_id?: string;
          parent_agency_id?: string;
        };
      };
      profile_viewable_agencies: {
        Row: {
          profile_id: string;
          agency_id: string;
        };
        Insert: {
          profile_id: string;
          agency_id: string;
        };
        Update: {
          profile_id?: string;
          agency_id?: string;
        };
      };
      livers: {
        Row: {
          id: string;
          name: string | null;
          address: string | null;
          acquisition_date: string | null;
          link: string | null;
          contact: string | null;
          birth_date: string | null;
          streaming_start_date: string | null;
          account_name: string | null;
          liver_id: string | null;
          email: string | null;
          tiktok_username: string | null;
          status: ApplicationStatus;
          agency_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          address?: string | null;
          acquisition_date?: string | null;
          link?: string | null;
          contact?: string | null;
          birth_date?: string | null;
          streaming_start_date?: string | null;
          account_name?: string | null;
          liver_id?: string | null;
          email?: string | null;
          tiktok_username?: string | null;
          status?: ApplicationStatus;
          agency_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          address?: string | null;
          acquisition_date?: string | null;
          link?: string | null;
          contact?: string | null;
          birth_date?: string | null;
          streaming_start_date?: string | null;
          account_name?: string | null;
          liver_id?: string | null;
          email?: string | null;
          tiktok_username?: string | null;
          status?: ApplicationStatus;
          agency_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      liver_agencies: {
        Row: {
          liver_id: string;
          agency_id: string;
        };
        Insert: {
          liver_id: string;
          agency_id: string;
        };
        Update: {
          liver_id?: string;
          agency_id?: string;
        };
      };
      monthly_reports: {
        Row: {
          id: string;
          rate: number;
          revenue_task: RevenueTask | null;
          created_at: string;
          data_month: string | null;
        };
        Insert: {
          id?: string;
          rate: number;
          revenue_task?: RevenueTask | null;
          created_at?: string;
          data_month?: string | null;
        };
        Update: {
          id?: string;
          rate?: number;
          revenue_task?: RevenueTask | null;
          created_at?: string;
          data_month?: string | null;
        };
      };
      csv_data: {
        Row: {
          id: string;
          creator_id: string | null;
          creator_nickname: string | null;
          handle: string | null;
          group: string | null;
          group_manager: string | null;
          creator_network_manager: string | null;
          data_month: string | null;
          diamonds: number;
          estimated_bonus: number;
          bonus_rookie_half_milestone: number;
          bonus_activeness: number;
          bonus_revenue_scale: number;
          bonus_rookie_milestone_1: number;
          bonus_rookie_milestone_2: number;
          bonus_off_platform: number;
          bonus_rookie_retention: number;
          valid_days: string | null;
          live_duration: string | null;
          is_violative: boolean;
          was_rookie: boolean;
          total_reward_jpy: number;
          agency_reward_jpy: number;
          liver_id: string | null;
          agency_id: string | null;
          monthly_report_id: string | null;
          upload_agency_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id?: string | null;
          creator_nickname?: string | null;
          handle?: string | null;
          group?: string | null;
          group_manager?: string | null;
          creator_network_manager?: string | null;
          data_month?: string | null;
          diamonds?: number;
          estimated_bonus?: number;
          bonus_rookie_half_milestone?: number;
          bonus_activeness?: number;
          bonus_revenue_scale?: number;
          bonus_rookie_milestone_1?: number;
          bonus_rookie_milestone_2?: number;
          bonus_off_platform?: number;
          bonus_rookie_retention?: number;
          valid_days?: string | null;
          live_duration?: string | null;
          is_violative?: boolean;
          was_rookie?: boolean;
          total_reward_jpy?: number;
          agency_reward_jpy?: number;
          liver_id?: string | null;
          agency_id?: string | null;
          monthly_report_id?: string | null;
          upload_agency_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string | null;
          creator_nickname?: string | null;
          handle?: string | null;
          group?: string | null;
          group_manager?: string | null;
          creator_network_manager?: string | null;
          data_month?: string | null;
          diamonds?: number;
          estimated_bonus?: number;
          bonus_rookie_half_milestone?: number;
          bonus_activeness?: number;
          bonus_revenue_scale?: number;
          bonus_rookie_milestone_1?: number;
          bonus_rookie_milestone_2?: number;
          bonus_off_platform?: number;
          bonus_rookie_retention?: number;
          valid_days?: string | null;
          live_duration?: string | null;
          is_violative?: boolean;
          was_rookie?: boolean;
          total_reward_jpy?: number;
          agency_reward_jpy?: number;
          liver_id?: string | null;
          agency_id?: string | null;
          monthly_report_id?: string | null;
          upload_agency_id?: string | null;
          created_at?: string;
        };
      };
      refunds: {
        Row: {
          id: string;
          target_month: string;
          reason: string | null;
          amount_usd: number;
          amount_jpy: number;
          is_deleted: boolean;
          agency_id: string | null;
          liver_id: string | null;
          monthly_report_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_month: string;
          reason?: string | null;
          amount_usd: number;
          amount_jpy: number;
          is_deleted?: boolean;
          agency_id?: string | null;
          liver_id?: string | null;
          monthly_report_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_month?: string;
          reason?: string | null;
          amount_usd?: number;
          amount_jpy?: number;
          is_deleted?: boolean;
          agency_id?: string | null;
          liver_id?: string | null;
          monthly_report_id?: string | null;
          created_at?: string;
        };
      };
      rate_change_logs: {
        Row: {
          id: string;
          monthly_report_id: string;
          old_rate: number;
          new_rate: number;
          affected_csv_rows: number;
          affected_refund_rows: number;
          changed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          monthly_report_id: string;
          old_rate: number;
          new_rate: number;
          affected_csv_rows: number;
          affected_refund_rows: number;
          changed_by: string;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          agency_id: string;
          monthly_report_id: string;
          subtotal_jpy: number;
          tax_rate: number;
          tax_amount_jpy: number;
          total_jpy: number;
          is_invoice_registered: boolean;
          invoice_registration_number: string | null;
          deductible_rate: number;
          agency_name: string;
          agency_address: string | null;
          agency_representative: string | null;
          bank_name: string | null;
          bank_branch: string | null;
          bank_account_type: AccountType | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          data_month: string | null;
          exchange_rate: number;
          commission_rate: number;
          sent_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          agency_id: string;
          monthly_report_id: string;
          subtotal_jpy: number;
          tax_rate: number;
          tax_amount_jpy: number;
          total_jpy: number;
          is_invoice_registered?: boolean;
          invoice_registration_number?: string | null;
          deductible_rate?: number;
          agency_name: string;
          agency_address?: string | null;
          agency_representative?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: AccountType | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          data_month?: string | null;
          exchange_rate: number;
          commission_rate: number;
          sent_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          agency_id?: string;
          monthly_report_id?: string;
          subtotal_jpy?: number;
          tax_rate?: number;
          tax_amount_jpy?: number;
          total_jpy?: number;
          is_invoice_registered?: boolean;
          invoice_registration_number?: string | null;
          deductible_rate?: number;
          agency_name?: string;
          agency_address?: string | null;
          agency_representative?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: AccountType | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          data_month?: string | null;
          exchange_rate?: number;
          commission_rate?: number;
          sent_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          name: string | null;
          address: string | null;
          birth_date: string | null;
          contact: string | null;
          email: string | null;
          additional_info: string | null;
          tiktok_username: string | null;
          tiktok_account_link: string | null;
          id_verified: boolean;
          status: ApplicationStatus;
          form_tab: FormTab;
          agency_id: string | null;
          liver_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          address?: string | null;
          birth_date?: string | null;
          contact?: string | null;
          email?: string | null;
          additional_info?: string | null;
          tiktok_username?: string | null;
          tiktok_account_link?: string | null;
          id_verified?: boolean;
          status?: ApplicationStatus;
          form_tab: FormTab;
          agency_id?: string | null;
          liver_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          address?: string | null;
          birth_date?: string | null;
          contact?: string | null;
          email?: string | null;
          additional_info?: string | null;
          tiktok_username?: string | null;
          tiktok_account_link?: string | null;
          id_verified?: boolean;
          status?: ApplicationStatus;
          form_tab?: FormTab;
          agency_id?: string | null;
          liver_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      application_status: ApplicationStatus;
      agency_rank: AgencyRank;
      form_tab: FormTab;
      revenue_task: RevenueTask;
      account_type: AccountType;
    };
  };
};

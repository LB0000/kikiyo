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
        };
        Insert: {
          id?: string;
          name: string;
          commission_rate?: number;
          rank?: AgencyRank | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          commission_rate?: number;
          rank?: AgencyRank | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
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
    };
  };
};

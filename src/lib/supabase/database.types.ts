// ============================================================================
// 自動生成ファイル — 手で編集しないこと
// 再生成: npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
//   （<ref> は NEXT_PUBLIC_SUPABASE_URL の https://<ref>.supabase.co の部分。要 `supabase login`）
// 生成日: 2026-08-19（マイグレーション 047 適用済み本番スキーマから）
// アプリで使う型エイリアス（UserRole 等）は ./types.ts に定義する。
// ============================================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_account_type: Database["public"]["Enums"]["account_type"] | null
          bank_branch: string | null
          bank_name: string | null
          commission_rate: number
          company_address: string | null
          company_name: string | null
          contract_person_name: string | null
          created_at: string | null
          id: string
          invoice_registration_number: string | null
          is_deleted: boolean
          name: string
          rank: Database["public"]["Enums"]["agency_rank"] | null
          registration_email_sent_at: string | null
          representative_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          commission_rate?: number
          company_address?: string | null
          company_name?: string | null
          contract_person_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name: string
          rank?: Database["public"]["Enums"]["agency_rank"] | null
          registration_email_sent_at?: string | null
          representative_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          commission_rate?: number
          company_address?: string | null
          company_name?: string | null
          contract_person_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name?: string
          rank?: Database["public"]["Enums"]["agency_rank"] | null
          registration_email_sent_at?: string | null
          representative_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agency_hierarchy: {
        Row: {
          agency_id: string
          parent_agency_id: string
        }
        Insert: {
          agency_id: string
          parent_agency_id: string
        }
        Update: {
          agency_id?: string
          parent_agency_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_hierarchy_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_hierarchy_parent_agency_id_fkey"
            columns: ["parent_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          additional_info: string | null
          address: string | null
          agency_id: string | null
          birth_date: string | null
          contact: string | null
          created_at: string | null
          email: string | null
          form_data: Json | null
          form_tab: Database["public"]["Enums"]["form_tab"]
          id: string
          id_verified: boolean | null
          liver_id: string | null
          name: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          tiktok_account_link: string | null
          tiktok_username: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          agency_id?: string | null
          birth_date?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          form_tab: Database["public"]["Enums"]["form_tab"]
          id?: string
          id_verified?: boolean | null
          liver_id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tiktok_account_link?: string | null
          tiktok_username?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          agency_id?: string | null
          birth_date?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          form_tab?: Database["public"]["Enums"]["form_tab"]
          id?: string
          id_verified?: boolean | null
          liver_id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tiktok_account_link?: string | null
          tiktok_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: false
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_change_logs: {
        Row: {
          changed_by: string
          created_at: string | null
          entity_kind: string
          id: string
          new_value: string | null
          old_value: string | null
          target_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          entity_kind: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          target_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          entity_kind?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          target_id?: string
        }
        Relationships: []
      }
      csv_data: {
        Row: {
          agency_id: string | null
          agency_reward_jpy: number | null
          bonus_activeness: number | null
          bonus_incremental_revenue: number | null
          bonus_maintained_tiers: number | null
          bonus_off_platform: number | null
          bonus_off_platform_2026_03: number | null
          bonus_ranked_up: number | null
          bonus_revenue_scale: number | null
          bonus_rookie_half_milestone: number | null
          bonus_rookie_milestone_1: number | null
          bonus_rookie_milestone_2: number | null
          bonus_rookie_retention: number | null
          created_at: string | null
          creator_id: string | null
          creator_network_manager: string | null
          creator_nickname: string | null
          data_month: string | null
          diamonds: number | null
          estimated_bonus: number | null
          group: string | null
          group_manager: string | null
          handle: string | null
          id: string
          is_violative: boolean | null
          live_duration: string | null
          liver_id: string | null
          manager_id: string | null
          monthly_report_id: string | null
          payment_bonus: number | null
          total_reward_jpy: number | null
          upload_agency_id: string | null
          valid_days: string | null
          was_rookie: boolean | null
        }
        Insert: {
          agency_id?: string | null
          agency_reward_jpy?: number | null
          bonus_activeness?: number | null
          bonus_incremental_revenue?: number | null
          bonus_maintained_tiers?: number | null
          bonus_off_platform?: number | null
          bonus_off_platform_2026_03?: number | null
          bonus_ranked_up?: number | null
          bonus_revenue_scale?: number | null
          bonus_rookie_half_milestone?: number | null
          bonus_rookie_milestone_1?: number | null
          bonus_rookie_milestone_2?: number | null
          bonus_rookie_retention?: number | null
          created_at?: string | null
          creator_id?: string | null
          creator_network_manager?: string | null
          creator_nickname?: string | null
          data_month?: string | null
          diamonds?: number | null
          estimated_bonus?: number | null
          group?: string | null
          group_manager?: string | null
          handle?: string | null
          id?: string
          is_violative?: boolean | null
          live_duration?: string | null
          liver_id?: string | null
          manager_id?: string | null
          monthly_report_id?: string | null
          payment_bonus?: number | null
          total_reward_jpy?: number | null
          upload_agency_id?: string | null
          valid_days?: string | null
          was_rookie?: boolean | null
        }
        Update: {
          agency_id?: string | null
          agency_reward_jpy?: number | null
          bonus_activeness?: number | null
          bonus_incremental_revenue?: number | null
          bonus_maintained_tiers?: number | null
          bonus_off_platform?: number | null
          bonus_off_platform_2026_03?: number | null
          bonus_ranked_up?: number | null
          bonus_revenue_scale?: number | null
          bonus_rookie_half_milestone?: number | null
          bonus_rookie_milestone_1?: number | null
          bonus_rookie_milestone_2?: number | null
          bonus_rookie_retention?: number | null
          created_at?: string | null
          creator_id?: string | null
          creator_network_manager?: string | null
          creator_nickname?: string | null
          data_month?: string | null
          diamonds?: number | null
          estimated_bonus?: number | null
          group?: string | null
          group_manager?: string | null
          handle?: string | null
          id?: string
          is_violative?: boolean | null
          live_duration?: string | null
          liver_id?: string | null
          manager_id?: string | null
          monthly_report_id?: string | null
          payment_bonus?: number | null
          total_reward_jpy?: number | null
          upload_agency_id?: string | null
          valid_days?: string | null
          was_rookie?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "csv_data_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_data_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: false
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_data_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_data_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_data_upload_agency_id_fkey"
            columns: ["upload_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_rule_change_logs: {
        Row: {
          changed_by: string
          created_at: string | null
          distribution_rule_id: string
          id: string
          new_rate: number
          old_rate: number | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          distribution_rule_id: string
          id?: string
          new_rate: number
          old_rate?: number | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          distribution_rule_id?: string
          id?: string
          new_rate?: number
          old_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rule_change_logs_distribution_rule_id_fkey"
            columns: ["distribution_rule_id"]
            isOneToOne: false
            referencedRelation: "distribution_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_rules: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          is_deleted: boolean
          manager_id: string | null
          payee_agency_id: string | null
          payee_kind: Database["public"]["Enums"]["payee_kind"]
          rate: number
          scout_id: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          manager_id?: string | null
          payee_agency_id?: string | null
          payee_kind: Database["public"]["Enums"]["payee_kind"]
          rate?: number
          scout_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          manager_id?: string | null
          payee_agency_id?: string | null
          payee_kind?: Database["public"]["Enums"]["payee_kind"]
          rate?: number
          scout_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_rules_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_rules_payee_agency_id_fkey"
            columns: ["payee_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_rules_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          amount_jpy: number
          applied_rate: number
          base_amount_jpy: number
          created_at: string | null
          id: string
          manager_id: string | null
          monthly_report_id: string
          payee_agency_id: string | null
          payee_kind: Database["public"]["Enums"]["payee_kind"]
          royalty_deduction_jpy: number
          scout_id: string | null
          source_agency_id: string | null
          tier: number
        }
        Insert: {
          amount_jpy: number
          applied_rate: number
          base_amount_jpy: number
          created_at?: string | null
          id?: string
          manager_id?: string | null
          monthly_report_id: string
          payee_agency_id?: string | null
          payee_kind: Database["public"]["Enums"]["payee_kind"]
          royalty_deduction_jpy?: number
          scout_id?: string | null
          source_agency_id?: string | null
          tier?: number
        }
        Update: {
          amount_jpy?: number
          applied_rate?: number
          base_amount_jpy?: number
          created_at?: string | null
          id?: string
          manager_id?: string | null
          monthly_report_id?: string
          payee_agency_id?: string | null
          payee_kind?: Database["public"]["Enums"]["payee_kind"]
          royalty_deduction_jpy?: number
          scout_id?: string | null
          source_agency_id?: string | null
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "distributions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_payee_agency_id_fkey"
            columns: ["payee_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_source_agency_id_fkey"
            columns: ["source_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_number_sequences: {
        Row: {
          last_number: number
          prefix: string
        }
        Insert: {
          last_number?: number
          prefix: string
        }
        Update: {
          last_number?: number
          prefix?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          agency_address: string | null
          agency_company_name: string | null
          agency_contract_person_name: string | null
          agency_id: string
          agency_name: string
          agency_representative: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_account_type: Database["public"]["Enums"]["account_type"] | null
          bank_branch: string | null
          bank_name: string | null
          commission_rate: number
          created_at: string | null
          created_by: string
          data_month: string | null
          deductible_rate: number
          exchange_rate: number
          id: string
          invoice_number: string
          invoice_registration_number: string | null
          is_invoice_registered: boolean
          monthly_report_id: string
          royalty_deduction_jpy: number
          royalty_rate: number
          sent_at: string | null
          subtotal_jpy: number
          tax_amount_jpy: number
          tax_rate: number
          total_jpy: number
          updated_at: string | null
        }
        Insert: {
          agency_address?: string | null
          agency_company_name?: string | null
          agency_contract_person_name?: string | null
          agency_id: string
          agency_name: string
          agency_representative?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          commission_rate: number
          created_at?: string | null
          created_by: string
          data_month?: string | null
          deductible_rate?: number
          exchange_rate: number
          id?: string
          invoice_number: string
          invoice_registration_number?: string | null
          is_invoice_registered?: boolean
          monthly_report_id: string
          royalty_deduction_jpy?: number
          royalty_rate?: number
          sent_at?: string | null
          subtotal_jpy: number
          tax_amount_jpy: number
          tax_rate: number
          total_jpy: number
          updated_at?: string | null
        }
        Update: {
          agency_address?: string | null
          agency_company_name?: string | null
          agency_contract_person_name?: string | null
          agency_id?: string
          agency_name?: string
          agency_representative?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          commission_rate?: number
          created_at?: string | null
          created_by?: string
          data_month?: string | null
          deductible_rate?: number
          exchange_rate?: number
          id?: string
          invoice_number?: string
          invoice_registration_number?: string | null
          is_invoice_registered?: boolean
          monthly_report_id?: string
          royalty_deduction_jpy?: number
          royalty_rate?: number
          sent_at?: string | null
          subtotal_jpy?: number
          tax_amount_jpy?: number
          tax_rate?: number
          total_jpy?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      liver_agencies: {
        Row: {
          agency_id: string
          liver_id: string
        }
        Insert: {
          agency_id: string
          liver_id: string
        }
        Update: {
          agency_id?: string
          liver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liver_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liver_agencies_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: false
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
        ]
      }
      liver_scouts: {
        Row: {
          created_at: string | null
          liver_id: string
          scout_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          liver_id: string
          scout_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          liver_id?: string
          scout_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liver_scouts_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: true
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liver_scouts_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      livers: {
        Row: {
          account_name: string | null
          acquisition_date: string | null
          address: string | null
          agency_id: string | null
          birth_date: string | null
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          link: string | null
          liver_id: string | null
          name: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          streaming_start_date: string | null
          tiktok_username: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          acquisition_date?: string | null
          address?: string | null
          agency_id?: string | null
          birth_date?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          link?: string | null
          liver_id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          streaming_start_date?: string | null
          tiktok_username?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          acquisition_date?: string | null
          address?: string | null
          agency_id?: string | null
          birth_date?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          link?: string | null
          liver_id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          streaming_start_date?: string | null
          tiktok_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_agencies: {
        Row: {
          agency_id: string
          created_at: string | null
          manager_id: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          manager_id: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          manager_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_agencies_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          backstage_group_manager: string | null
          company_name: string | null
          created_at: string | null
          id: string
          invoice_registration_number: string | null
          is_deleted: boolean
          name: string
          representative_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          backstage_group_manager?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name: string
          representative_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          backstage_group_manager?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name?: string
          representative_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string | null
          data_month: string | null
          id: string
          rate: number
          revenue_task: Database["public"]["Enums"]["revenue_task"] | null
        }
        Insert: {
          created_at?: string | null
          data_month?: string | null
          id?: string
          rate: number
          revenue_task?: Database["public"]["Enums"]["revenue_task"] | null
        }
        Update: {
          created_at?: string | null
          data_month?: string | null
          id?: string
          rate?: number
          revenue_task?: Database["public"]["Enums"]["revenue_task"] | null
        }
        Relationships: []
      }
      profile_viewable_agencies: {
        Row: {
          agency_id: string
          profile_id: string
        }
        Insert: {
          agency_id: string
          profile_id: string
        }
        Update: {
          agency_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_viewable_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_viewable_agencies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_change_logs: {
        Row: {
          affected_csv_rows: number
          affected_refund_rows: number
          changed_by: string
          created_at: string | null
          id: string
          monthly_report_id: string
          new_rate: number
          old_rate: number
        }
        Insert: {
          affected_csv_rows?: number
          affected_refund_rows?: number
          changed_by: string
          created_at?: string | null
          id?: string
          monthly_report_id: string
          new_rate: number
          old_rate: number
        }
        Update: {
          affected_csv_rows?: number
          affected_refund_rows?: number
          changed_by?: string
          created_at?: string | null
          id?: string
          monthly_report_id?: string
          new_rate?: number
          old_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_change_logs_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          agency_id: string | null
          amount_jpy: number
          amount_usd: number
          created_at: string | null
          id: string
          is_deleted: boolean | null
          liver_id: string | null
          monthly_report_id: string | null
          reason: string | null
          target_month: string
        }
        Insert: {
          agency_id?: string | null
          amount_jpy: number
          amount_usd: number
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          liver_id?: string | null
          monthly_report_id?: string | null
          reason?: string | null
          target_month: string
        }
        Update: {
          agency_id?: string | null
          amount_jpy?: number
          amount_usd?: number
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          liver_id?: string | null
          monthly_report_id?: string | null
          reason?: string | null
          target_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: false
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_agencies: {
        Row: {
          agency_id: string
          created_at: string | null
          scout_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          scout_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_agencies_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_account_type: Database["public"]["Enums"]["account_type"] | null
          bank_branch: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          invoice_registration_number: string | null
          is_deleted: boolean
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          invoice_registration_number?: string | null
          is_deleted?: boolean
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      special_bonuses: {
        Row: {
          agency_id: string | null
          amount_jpy: number
          amount_usd: number
          created_at: string
          id: string
          is_deleted: boolean
          liver_id: string | null
          monthly_report_id: string | null
          reason: string | null
          target_month: string
        }
        Insert: {
          agency_id?: string | null
          amount_jpy?: number
          amount_usd?: number
          created_at?: string
          id?: string
          is_deleted?: boolean
          liver_id?: string | null
          monthly_report_id?: string | null
          reason?: string | null
          target_month: string
        }
        Update: {
          agency_id?: string | null
          amount_jpy?: number
          amount_usd?: number
          created_at?: string
          id?: string
          is_deleted?: boolean
          liver_id?: string | null
          monthly_report_id?: string | null
          reason?: string | null
          target_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_bonuses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_bonuses_liver_id_fkey"
            columns: ["liver_id"]
            isOneToOne: false
            referencedRelation: "livers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_bonuses_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_distribution_amount: {
        Args: { p_base: number; p_rate: number }
        Returns: number
      }
      calc_distribution_base: {
        Args: { p_gross: number; p_running: number }
        Returns: number
      }
      calc_royalty_deduction: {
        Args: { p_amount: number; p_is_registered: boolean }
        Returns: number
      }
      get_distribution_rate: {
        Args: {
          p_agency_id: string
          p_manager_id: string
          p_payee_agency_id: string
          p_payee_kind: Database["public"]["Enums"]["payee_kind"]
          p_scout_id: string
        }
        Returns: number
      }
      get_user_manager_agency_ids: { Args: never; Returns: string[] }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_scout_id: { Args: never; Returns: string }
      get_viewable_agency_ids: { Args: never; Returns: string[] }
      next_invoice_number: { Args: { p_prefix: string }; Returns: string }
      recalculate_distributions: {
        Args: { p_monthly_report_id: string }
        Returns: undefined
      }
      relink_liver_csv_data: {
        Args: {
          p_liver_id: string
          p_new_tiktok_username: string
          p_old_tiktok_username: string
        }
        Returns: undefined
      }
      update_commission_rate: {
        Args: { p_agency_id: string; p_new_commission_rate: number }
        Returns: undefined
      }
      update_exchange_rate: {
        Args: { p_monthly_report_id: string; p_new_rate: number }
        Returns: undefined
      }
      update_liver_agency: {
        Args: { p_liver_id: string; p_new_agency_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "futsu" | "toza"
      agency_rank: "rank_2" | "rank_3" | "rank_4"
      application_status:
        | "completed"
        | "released"
        | "authorized"
        | "pending"
        | "rejected"
      form_tab:
        | "affiliation_check"
        | "streaming_auth"
        | "subscription_cancel"
        | "account_id_change"
        | "event_build"
        | "special_referral"
        | "objection"
      payee_kind: "total_side" | "manager" | "agency" | "scout"
      revenue_task:
        | "task_1"
        | "task_2"
        | "task_3"
        | "task_4"
        | "task_5"
        | "task_6_plus"
      user_role: "system_admin" | "agency_user" | "manager_user" | "scout_user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["futsu", "toza"],
      agency_rank: ["rank_2", "rank_3", "rank_4"],
      application_status: [
        "completed",
        "released",
        "authorized",
        "pending",
        "rejected",
      ],
      form_tab: [
        "affiliation_check",
        "streaming_auth",
        "subscription_cancel",
        "account_id_change",
        "event_build",
        "special_referral",
        "objection",
      ],
      payee_kind: ["total_side", "manager", "agency", "scout"],
      revenue_task: [
        "task_1",
        "task_2",
        "task_3",
        "task_4",
        "task_5",
        "task_6_plus",
      ],
      user_role: ["system_admin", "agency_user", "manager_user", "scout_user"],
    },
  },
} as const

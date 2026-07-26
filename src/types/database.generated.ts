export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          archived_at: string | null
          created_at: string
          current_value: number
          household_id: string
          icon: string | null
          id: string
          meta: Json
          name: string
          owner_person_id: string | null
          subtitle: string | null
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
          valued_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_value: number
          household_id: string
          icon?: string | null
          id?: string
          meta?: Json
          name: string
          owner_person_id?: string | null
          subtitle?: string | null
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          valued_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_value?: number
          household_id?: string
          icon?: string | null
          id?: string
          meta?: Json
          name?: string
          owner_person_id?: string | null
          subtitle?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          valued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_owner_person_id_household_id_fkey"
            columns: ["owner_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      budget_adjustments: {
        Row: {
          category_id: string
          counterpart_category_id: string | null
          created_at: string
          created_by: string
          delta: number
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          month: string
          note: string
          scope: Database["public"]["Enums"]["adjustment_scope"]
        }
        Insert: {
          category_id: string
          counterpart_category_id?: string | null
          created_at?: string
          created_by: string
          delta: number
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          month: string
          note?: string
          scope?: Database["public"]["Enums"]["adjustment_scope"]
        }
        Update: {
          category_id?: string
          counterpart_category_id?: string | null
          created_at?: string
          created_by?: string
          delta?: number
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["adjustment_kind"]
          month?: string
          note?: string
          scope?: Database["public"]["Enums"]["adjustment_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "budget_adjustments_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "budget_adjustments_counterpart_category_id_household_id_fkey"
            columns: ["counterpart_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "budget_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_adjustments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          archived_at: string | null
          created_at: string
          household_id: string
          id: string
          legal_form: Database["public"]["Enums"]["legal_form"]
          name: string
          owner_person_id: string
          updated_at: string
          vat_rate: number
          vat_reporting_frequency: Database["public"]["Enums"]["vat_reporting_frequency"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          legal_form: Database["public"]["Enums"]["legal_form"]
          name: string
          owner_person_id: string
          updated_at?: string
          vat_rate: number
          vat_reporting_frequency: Database["public"]["Enums"]["vat_reporting_frequency"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          legal_form?: Database["public"]["Enums"]["legal_form"]
          name?: string
          owner_person_id?: string
          updated_at?: string
          vat_rate?: number
          vat_reporting_frequency?: Database["public"]["Enums"]["vat_reporting_frequency"]
        }
        Relationships: [
          {
            foreignKeyName: "businesses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_person_id_household_id_fkey"
            columns: ["owner_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      categories: {
        Row: {
          archived_at: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          household_id: string
          icon: string
          id: string
          name: string
          priority: Database["public"]["Enums"]["category_priority"]
          short_name: string
          sort_order: number
          tint: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id: string
          icon: string
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["category_priority"]
          short_name: string
          sort_order?: number
          tint?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["category_priority"]
          short_name?: string
          sort_order?: number
          tint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      children_profiles: {
        Row: {
          created_at: string
          household_id: string
          id: string
          monthly_deposit: number
          person_id: string
          target_age: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          monthly_deposit?: number
          person_id: string
          target_age?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          monthly_deposit?: number
          person_id?: string
          target_age?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_profiles_person_id_household_id_fkey"
            columns: ["person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      expected_transactions: {
        Row: {
          amount: number
          category_id: string | null
          certainty: Database["public"]["Enums"]["income_certainty"] | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          direction: Database["public"]["Enums"]["flow_direction"]
          due_date: string | null
          estimate: boolean
          fulfilled_txn_id: string | null
          group_kind: Database["public"]["Enums"]["expected_group"]
          household_id: string
          icon: string | null
          id: string
          month: string
          name: string
          recurring_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          certainty?: Database["public"]["Enums"]["income_certainty"] | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          direction: Database["public"]["Enums"]["flow_direction"]
          due_date?: string | null
          estimate?: boolean
          fulfilled_txn_id?: string | null
          group_kind: Database["public"]["Enums"]["expected_group"]
          household_id: string
          icon?: string | null
          id?: string
          month: string
          name: string
          recurring_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          certainty?: Database["public"]["Enums"]["income_certainty"] | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          direction?: Database["public"]["Enums"]["flow_direction"]
          due_date?: string | null
          estimate?: boolean
          fulfilled_txn_id?: string | null
          group_kind?: Database["public"]["Enums"]["expected_group"]
          household_id?: string
          icon?: string | null
          id?: string
          month?: string
          name?: string
          recurring_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expected_transactions_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "expected_transactions_fulfilled_txn_id_household_id_fkey"
            columns: ["fulfilled_txn_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "expected_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_recurring_id_household_id_fkey"
            columns: ["recurring_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          archived_at: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          household_id: string
          icon: string
          id: string
          institution: string | null
          is_asset: boolean
          last4: string | null
          name: string
          opening_balance: number
          opening_balance_date: string | null
          owner_person_id: string | null
          sort_order: number
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id: string
          icon?: string
          id?: string
          institution?: string | null
          is_asset?: boolean
          last4?: string | null
          name: string
          opening_balance?: number
          opening_balance_date?: string | null
          owner_person_id?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          institution?: string | null
          is_asset?: boolean
          last4?: string | null
          name?: string
          opening_balance?: number
          opening_balance_date?: string | null
          owner_person_id?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_owner_person_id_household_id_fkey"
            columns: ["owner_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          archived_at: string | null
          beneficiary_person_id: string | null
          created_at: string
          current_amount: number
          household_id: string
          icon: string | null
          id: string
          linked_asset_id: string | null
          monthly_deposit: number
          name: string
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          beneficiary_person_id?: string | null
          created_at?: string
          current_amount?: number
          household_id: string
          icon?: string | null
          id?: string
          linked_asset_id?: string | null
          monthly_deposit?: number
          name: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          beneficiary_person_id?: string | null
          created_at?: string
          current_amount?: number
          household_id?: string
          icon?: string | null
          id?: string
          linked_asset_id?: string | null
          monthly_deposit?: number
          name?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_beneficiary_person_id_household_id_fkey"
            columns: ["beneficiary_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "financial_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_linked_asset_id_household_id_fkey"
            columns: ["linked_asset_id", "household_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date: string
          goal_id: string
          household_id: string
          id: string
          note: string | null
          source_account_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          date: string
          goal_id: string
          household_id: string
          id?: string
          note?: string | null
          source_account_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date?: string
          goal_id?: string
          household_id?: string
          id?: string
          note?: string | null
          source_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_household_id_fkey"
            columns: ["goal_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "goal_contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_source_account_id_household_id_fkey"
            columns: ["source_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          carry_over_enabled: boolean
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          carry_over_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          carry_over_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_account_mappings: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          created_by: string
          financial_account_id: string
          household_id: string
          id: string
          masked_last4: string
          provider: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          created_by: string
          financial_account_id: string
          household_id: string
          id?: string
          masked_last4: string
          provider: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          created_by?: string
          financial_account_id?: string
          household_id?: string
          id?: string
          masked_last4?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_account_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_account_mappings_financial_account_id_household_id_fkey"
            columns: ["financial_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "import_account_mappings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string
          detected_count: number
          display_file_name: string
          duplicate_count: number
          file_sha256: string
          household_id: string
          id: string
          inserted_count: number
          parser_version: string
          provider: string
          review_count: number
          rolled_back_at: string | null
          rolled_back_by: string | null
          skipped_count: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          detected_count: number
          display_file_name: string
          duplicate_count?: number
          file_sha256: string
          household_id: string
          id?: string
          inserted_count?: number
          parser_version: string
          provider: string
          review_count?: number
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skipped_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          detected_count?: number
          display_file_name?: string
          duplicate_count?: number
          file_sha256?: string
          household_id?: string
          id?: string
          inserted_count?: number
          parser_version?: string
          provider?: string
          review_count?: number
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skipped_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_rolled_back_by_fkey"
            columns: ["rolled_back_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          batch_id: string
          committed_snapshot: Json | null
          created_at: string
          duplicate_of_transaction_id: string | null
          fingerprint: string
          household_id: string
          id: string
          provider_reference: string | null
          rolled_back_at: string | null
          source_row: number
          status: string
          transaction_id: string | null
        }
        Insert: {
          batch_id: string
          committed_snapshot?: Json | null
          created_at?: string
          duplicate_of_transaction_id?: string | null
          fingerprint: string
          household_id: string
          id?: string
          provider_reference?: string | null
          rolled_back_at?: string | null
          source_row: number
          status: string
          transaction_id?: string | null
        }
        Update: {
          batch_id?: string
          committed_snapshot?: Json | null
          created_at?: string
          duplicate_of_transaction_id?: string | null
          fingerprint?: string
          household_id?: string
          id?: string
          provider_reference?: string | null
          rolled_back_at?: string | null
          source_row?: number
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_household_id_fkey"
            columns: ["batch_id", "household_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "import_rows_duplicate_of_transaction_id_household_id_fkey"
            columns: ["duplicate_of_transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "import_rows_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      income_sources: {
        Row: {
          active: boolean
          business_id: string | null
          certainty: Database["public"]["Enums"]["income_certainty"]
          created_at: string
          expected_amount: number
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["income_class"]
          name: string
          person_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          certainty: Database["public"]["Enums"]["income_certainty"]
          created_at?: string
          expected_amount: number
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["income_class"]
          name: string
          person_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string | null
          certainty?: Database["public"]["Enums"]["income_certainty"]
          created_at?: string
          expected_amount?: number
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["income_class"]
          name?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_business_id_household_id_fkey"
            columns: ["business_id", "household_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "income_sources_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_sources_person_id_household_id_fkey"
            columns: ["person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      installment_entries: {
        Row: {
          amount: number
          created_at: string
          due_month: string
          household_id: string
          id: string
          plan_id: string
          sequence: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_month: string
          household_id: string
          id?: string
          plan_id: string
          sequence: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_month?: string
          household_id?: string
          id?: string
          plan_id?: string
          sequence?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_entries_plan_id_household_id_fkey"
            columns: ["plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "installment_entries_transaction_fk"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          account_id: string
          category_id: string
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          first_charge_date: string
          household_id: string
          icon: string | null
          id: string
          installments_count: number
          merchant_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          category_id: string
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          first_charge_date: string
          household_id: string
          icon?: string | null
          id?: string
          installments_count: number
          merchant_name: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          category_id?: string
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          first_charge_date?: string
          household_id?: string
          icon?: string | null
          id?: string
          installments_count?: number
          merchant_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "installment_plans_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "installment_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          archived_at: string | null
          coverage_summary: string
          created_at: string
          household_id: string
          id: string
          insured_person_id: string | null
          name: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          premium_monthly: number
          provider: string
          renewal_date: string | null
          status: Database["public"]["Enums"]["policy_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          coverage_summary?: string
          created_at?: string
          household_id: string
          id?: string
          insured_person_id?: string | null
          name: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          premium_monthly: number
          provider: string
          renewal_date?: string | null
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          coverage_summary?: string
          created_at?: string
          household_id?: string
          id?: string
          insured_person_id?: string | null
          name?: string
          policy_type?: Database["public"]["Enums"]["policy_type"]
          premium_monthly?: number
          provider?: string
          renewal_date?: string | null
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_insured_person_id_household_id_fkey"
            columns: ["insured_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      internal_transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          from_account_id: string
          from_txn_id: string | null
          household_id: string
          id: string
          to_account_id: string
          to_txn_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          from_account_id: string
          from_txn_id?: string | null
          household_id: string
          id?: string
          to_account_id: string
          to_txn_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          from_account_id?: string
          from_txn_id?: string | null
          household_id?: string
          id?: string
          to_account_id?: string
          to_txn_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_transfers_from_account_id_household_id_fkey"
            columns: ["from_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "internal_transfers_from_txn_fk"
            columns: ["from_txn_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "internal_transfers_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_to_account_id_household_id_fkey"
            columns: ["to_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "internal_transfers_to_txn_fk"
            columns: ["to_txn_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      liabilities: {
        Row: {
          archived_at: string | null
          balance: number
          created_at: string
          end_date: string | null
          household_id: string
          id: string
          institution: string | null
          name: string
          type: Database["public"]["Enums"]["liability_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          balance: number
          created_at?: string
          end_date?: string | null
          household_id: string
          id?: string
          institution?: string | null
          name: string
          type: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          created_at?: string
          end_date?: string | null
          household_id?: string
          id?: string
          institution?: string | null
          name?: string
          type?: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          archived_at: string | null
          category_id: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          created_by: string
          household_id: string
          id: string
          mark_as_transfer: boolean
          merchant_pattern: string
          owner_person_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          mark_as_transfer?: boolean
          merchant_pattern: string
          owner_person_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          mark_as_transfer?: boolean
          merchant_pattern?: string
          owner_person_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "merchant_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_rules_owner_person_id_household_id_fkey"
            columns: ["owner_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      monthly_budget_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          household_id: string
          id: string
          monthly_budget_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          monthly_budget_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          monthly_budget_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_items_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "monthly_budget_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_budget_items_monthly_budget_id_household_id_fkey"
            columns: ["monthly_budget_id", "household_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          household_id: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          context: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          created_at: string
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["person_kind"]
          name: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["person_kind"]
          name: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["person_kind"]
          name?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          display_name: string
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          display_name: string
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number | null
          cadence: Database["public"]["Enums"]["recurring_cadence"]
          category_id: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          day_of_month: number
          direction: Database["public"]["Enums"]["flow_direction"]
          estimate: boolean
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount?: number | null
          cadence?: Database["public"]["Enums"]["recurring_cadence"]
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          day_of_month: number
          direction?: Database["public"]["Enums"]["flow_direction"]
          estimate?: boolean
          household_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number | null
          cadence?: Database["public"]["Enums"]["recurring_cadence"]
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          day_of_month?: number
          direction?: Database["public"]["Enums"]["flow_direction"]
          estimate?: boolean
          household_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      review_items: {
        Row: {
          created_at: string
          household_id: string
          id: string
          reason: Database["public"]["Enums"]["review_reason"]
          resolution: Json | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          reason: Database["public"]["Enums"]["review_reason"]
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          reason?: Database["public"]["Enums"]["review_reason"]
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          archived_at: string | null
          category_id: string | null
          context: Database["public"]["Enums"]["finance_context"]
          created_at: string
          created_by: string | null
          currency: string
          date: string
          description: string | null
          household_id: string
          icon: string | null
          id: string
          income_class: Database["public"]["Enums"]["income_class"] | null
          installment_entry_id: string | null
          kind: Database["public"]["Enums"]["transaction_kind"]
          merchant_name: string
          needs_review: boolean
          notes: string | null
          occurred_at: string | null
          owner_person_id: string | null
          review_reason: Database["public"]["Enums"]["review_reason"] | null
          status: Database["public"]["Enums"]["transaction_status"]
          transfer_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          archived_at?: string | null
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          created_by?: string | null
          currency?: string
          date: string
          description?: string | null
          household_id: string
          icon?: string | null
          id?: string
          income_class?: Database["public"]["Enums"]["income_class"] | null
          installment_entry_id?: string | null
          kind: Database["public"]["Enums"]["transaction_kind"]
          merchant_name: string
          needs_review?: boolean
          notes?: string | null
          occurred_at?: string | null
          owner_person_id?: string | null
          review_reason?: Database["public"]["Enums"]["review_reason"] | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          archived_at?: string | null
          category_id?: string | null
          context?: Database["public"]["Enums"]["finance_context"]
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          income_class?: Database["public"]["Enums"]["income_class"] | null
          installment_entry_id?: string | null
          kind?: Database["public"]["Enums"]["transaction_kind"]
          merchant_name?: string
          needs_review?: boolean
          notes?: string | null
          occurred_at?: string | null
          owner_person_id?: string | null
          review_reason?: Database["public"]["Enums"]["review_reason"] | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_entry_fk"
            columns: ["installment_entry_id", "household_id"]
            isOneToOne: false
            referencedRelation: "installment_entries"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_owner_person_id_household_id_fkey"
            columns: ["owner_person_id", "household_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_transfer_fk"
            columns: ["transfer_id", "household_id"]
            isOneToOne: false
            referencedRelation: "internal_transfers"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      commit_categorized_transaction_import: {
        Args: {
          p_display_file_name: string
          p_file_sha256: string
          p_household_id: string
          p_parser_version: string
          p_provider: string
          p_rows: Json
          p_skipped_count?: number
        }
        Returns: {
          batch_id: string
          duplicate_count: number
          inserted_count: number
          review_count: number
        }[]
      }
      commit_transaction_import: {
        Args: {
          p_display_file_name: string
          p_file_sha256: string
          p_household_id: string
          p_parser_version: string
          p_provider: string
          p_rows: Json
          p_skipped_count?: number
        }
        Returns: {
          batch_id: string
          duplicate_count: number
          inserted_count: number
          review_count: number
        }[]
      }
      create_household: { Args: { p_name: string }; Returns: string }
      create_household_invitation: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["member_role"]
        }
        Returns: string
      }
      create_internal_transfer: {
        Args: {
          p_amount: number
          p_date: string
          p_from_account: string
          p_household_id: string
          p_note?: string
          p_to_account: string
        }
        Returns: string
      }
      get_pending_household_invitation: {
        Args: never
        Returns: {
          expires_at: string
          household_name: string
          invitation_id: string
          invited_role: Database["public"]["Enums"]["member_role"]
          inviter_name: string
          is_expired: boolean
        }[]
      }
      remove_internal_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      revoke_household_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      rollback_transaction_import: {
        Args: { p_batch_id: string }
        Returns: {
          archived_count: number
          conflict_count: number
        }[]
      }
    }
    Enums: {
      account_type:
        | "bank"
        | "credit_card"
        | "wallet"
        | "cash"
        | "investment"
        | "savings"
        | "pension"
        | "education_fund"
        | "other"
      adjustment_kind: "reallocation" | "increase" | "decrease" | "exceptional"
      adjustment_scope: "one_time" | "permanent"
      asset_type:
        | "real_estate"
        | "pension"
        | "education_fund"
        | "provident_fund"
        | "investment"
        | "savings"
        | "child_savings"
        | "deposit"
        | "other"
      category_priority:
        | "essential"
        | "important"
        | "flexible"
        | "discretionary"
      expected_group: "fixed" | "variable_estimate" | "one_time"
      finance_context: "household" | "business"
      flow_direction: "inflow" | "outflow"
      goal_status: "active" | "paused" | "done"
      income_certainty: "guaranteed" | "uncertain"
      income_class: "salary" | "business" | "other"
      legal_form: "osek_patur" | "osek_murshe" | "company"
      liability_type: "mortgage" | "loan" | "other"
      member_role: "owner" | "member" | "viewer"
      person_kind: "adult" | "child"
      policy_status: "active" | "renewal_due" | "lapsed"
      policy_type:
        | "life"
        | "health"
        | "car"
        | "home"
        | "mortgage"
        | "disability"
        | "other"
      recurring_cadence: "monthly" | "bimonthly" | "weekly" | "yearly"
      review_reason:
        | "uncategorized"
        | "unrecognized_merchant"
        | "possible_duplicate"
        | "possible_transfer"
        | "low_confidence"
      review_status: "open" | "resolved" | "dismissed"
      transaction_kind: "expense" | "income" | "refund" | "transfer"
      transaction_status: "cleared" | "pending"
      vat_reporting_frequency: "monthly" | "bimonthly"
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
      account_type: [
        "bank",
        "credit_card",
        "wallet",
        "cash",
        "investment",
        "savings",
        "pension",
        "education_fund",
        "other",
      ],
      adjustment_kind: ["reallocation", "increase", "decrease", "exceptional"],
      adjustment_scope: ["one_time", "permanent"],
      asset_type: [
        "real_estate",
        "pension",
        "education_fund",
        "provident_fund",
        "investment",
        "savings",
        "child_savings",
        "deposit",
        "other",
      ],
      category_priority: [
        "essential",
        "important",
        "flexible",
        "discretionary",
      ],
      expected_group: ["fixed", "variable_estimate", "one_time"],
      finance_context: ["household", "business"],
      flow_direction: ["inflow", "outflow"],
      goal_status: ["active", "paused", "done"],
      income_certainty: ["guaranteed", "uncertain"],
      income_class: ["salary", "business", "other"],
      legal_form: ["osek_patur", "osek_murshe", "company"],
      liability_type: ["mortgage", "loan", "other"],
      member_role: ["owner", "member", "viewer"],
      person_kind: ["adult", "child"],
      policy_status: ["active", "renewal_due", "lapsed"],
      policy_type: [
        "life",
        "health",
        "car",
        "home",
        "mortgage",
        "disability",
        "other",
      ],
      recurring_cadence: ["monthly", "bimonthly", "weekly", "yearly"],
      review_reason: [
        "uncategorized",
        "unrecognized_merchant",
        "possible_duplicate",
        "possible_transfer",
        "low_confidence",
      ],
      review_status: ["open", "resolved", "dismissed"],
      transaction_kind: ["expense", "income", "refund", "transfer"],
      transaction_status: ["cleared", "pending"],
      vat_reporting_frequency: ["monthly", "bimonthly"],
    },
  },
} as const

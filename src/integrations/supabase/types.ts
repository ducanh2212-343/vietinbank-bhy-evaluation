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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_comments: {
        Row: {
          comment: string
          comment_type: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
        }
        Insert: {
          comment: string
          comment_type?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          comment?: string
          comment_type?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_evaluations: {
        Row: {
          classification:
            | Database["public"]["Enums"]["staff_classification"]
            | null
          completion_status: string
          created_at: string
          current_levels: number[] | null
          cycle_id: string | null
          development_plan: string | null
          employee_id: string
          id: string
          priority_skill_ids: string[] | null
          remark: string | null
          target_levels: number[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          classification?:
            | Database["public"]["Enums"]["staff_classification"]
            | null
          completion_status?: string
          created_at?: string
          current_levels?: number[] | null
          cycle_id?: string | null
          development_plan?: string | null
          employee_id: string
          id?: string
          priority_skill_ids?: string[] | null
          remark?: string | null
          target_levels?: number[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          classification?:
            | Database["public"]["Enums"]["staff_classification"]
            | null
          completion_status?: string
          created_at?: string
          current_levels?: number[] | null
          cycle_id?: string | null
          development_plan?: string | null
          employee_id?: string
          id?: string
          priority_skill_ids?: string[] | null
          remark?: string | null
          target_levels?: number[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          action_type: string | null
          created_at: string
          form_id: string
          id: string
          is_accepted: boolean
          skill_assessment_id: string | null
          suggestion: string
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          form_id: string
          id?: string
          is_accepted?: boolean
          skill_assessment_id?: string | null
          suggestion: string
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          form_id?: string
          id?: string
          is_accepted?: boolean
          skill_assessment_id?: string | null
          suggestion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_skill_assessment_id_fkey"
            columns: ["skill_assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          content: string
          description: string | null
          is_active: boolean
          mode: string
          model: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          description?: string | null
          is_active?: boolean
          mode: string
          model?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          description?: string | null
          is_active?: boolean
          mode?: string
          model?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          api_base_url: string | null
          api_key: string | null
          id: number
          max_tokens: number
          model: string
          provider: string
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_base_url?: string | null
          api_key?: string | null
          id?: number
          max_tokens?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_base_url?: string | null
          api_key?: string | null
          id?: number
          max_tokens?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string
          id: string
          mode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      attitude_dimensions_catalog: {
        Row: {
          created_at: string
          expected_behaviors: string | null
          failing_behaviors: string | null
          id: number
          is_active: boolean
          manager_action: string | null
          name: string
          outstanding_behaviors: string | null
          progress_evidence: string | null
          self_improvement: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_behaviors?: string | null
          failing_behaviors?: string | null
          id: number
          is_active?: boolean
          manager_action?: string | null
          name: string
          outstanding_behaviors?: string | null
          progress_evidence?: string | null
          self_improvement?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_behaviors?: string | null
          failing_behaviors?: string | null
          id?: number
          is_active?: boolean
          manager_action?: string | null
          name?: string
          outstanding_behaviors?: string | null
          progress_evidence?: string | null
          self_improvement?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      behavior_notes: {
        Row: {
          ai_draft: Json | null
          attitude_dimension_ids: number[]
          behavior: string | null
          behavior_type: string
          confirmed_at: string | null
          created_at: string
          employee_id: string
          id: string
          impact: string | null
          impact_level: string | null
          is_repeated: boolean | null
          observer_id: string
          occurred_at: string
          raw_text: string
          shared_with_employee: boolean
          situation: string | null
          skill_ids: string[]
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          ai_draft?: Json | null
          attitude_dimension_ids?: number[]
          behavior?: string | null
          behavior_type: string
          confirmed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          impact?: string | null
          impact_level?: string | null
          is_repeated?: boolean | null
          observer_id: string
          occurred_at?: string
          raw_text: string
          shared_with_employee?: boolean
          situation?: string | null
          skill_ids?: string[]
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          ai_draft?: Json | null
          attitude_dimension_ids?: number[]
          behavior?: string | null
          behavior_type?: string
          confirmed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          impact?: string | null
          impact_level?: string | null
          is_repeated?: boolean | null
          observer_id?: string
          occurred_at?: string
          raw_text?: string
          shared_with_employee?: boolean
          situation?: string | null
          skill_ids?: string[]
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_notes_observer_id_fkey"
            columns: ["observer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      council_criteria: {
        Row: {
          anchor_0: string | null
          anchor_10: string | null
          anchor_3: string | null
          anchor_6: string | null
          anchor_8: string | null
          created_at: string
          criterion_key: string
          description: string | null
          id: string
          is_active: boolean
          round_id: string
          section: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          anchor_0?: string | null
          anchor_10?: string | null
          anchor_3?: string | null
          anchor_6?: string | null
          anchor_8?: string | null
          created_at?: string
          criterion_key: string
          description?: string | null
          id?: string
          is_active?: boolean
          round_id: string
          section?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          anchor_0?: string | null
          anchor_10?: string | null
          anchor_3?: string | null
          anchor_6?: string | null
          anchor_8?: string | null
          created_at?: string
          criterion_key?: string
          description?: string | null
          id?: string
          is_active?: boolean
          round_id?: string
          section?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_criteria_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "council_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      council_evaluation_scores: {
        Row: {
          created_at: string
          criterion_id: string
          evaluation_id: string
          evidence: string | null
          id: string
          score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          evaluation_id: string
          evidence?: string | null
          id?: string
          score: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          evaluation_id?: string
          evidence?: string | null
          id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "council_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "council_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      council_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          evidence: string | null
          id: string
          round_id: string
          status: string
          strengths: string | null
          subject_id: string
          submitted_at: string | null
          suggestions: string | null
          updated_at: string
          weaknesses: string | null
          wish: string | null
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          evidence?: string | null
          id?: string
          round_id: string
          status?: string
          strengths?: string | null
          subject_id: string
          submitted_at?: string | null
          suggestions?: string | null
          updated_at?: string
          weaknesses?: string | null
          wish?: string | null
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          evidence?: string | null
          id?: string
          round_id?: string
          status?: string
          strengths?: string | null
          subject_id?: string
          submitted_at?: string | null
          suggestions?: string | null
          updated_at?: string
          weaknesses?: string | null
          wish?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_evaluations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "council_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_evaluations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "council_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      council_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_group: string
          note: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_group?: string
          note?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_group?: string
          note?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      council_rounds: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          results_published: boolean
          start_date: string | null
          status: string
          updated_at: string
          voting_deadline: string | null
          weight_config: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          results_published?: boolean
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_deadline?: string | null
          weight_config?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          results_published?: boolean
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_deadline?: string | null
          weight_config?: Json | null
        }
        Relationships: []
      }
      council_subjects: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          measurement: string | null
          position: string | null
          profile_id: string | null
          round_id: string
          sort_order: number
          subject_level: string
          supervisor_pgd_id: string | null
          task_summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          measurement?: string | null
          position?: string | null
          profile_id?: string | null
          round_id: string
          sort_order?: number
          subject_level?: string
          supervisor_pgd_id?: string | null
          task_summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          measurement?: string | null
          position?: string | null
          profile_id?: string | null
          round_id?: string
          sort_order?: number
          subject_level?: string
          supervisor_pgd_id?: string | null
          task_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_subjects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_subjects_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "council_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_subjects_supervisor_pgd_id_fkey"
            columns: ["supervisor_pgd_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_departments_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      development_actions: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          deadline: string | null
          evidence: string | null
          form_id: string
          id: string
          pdca_checkpoint: string | null
          progress_note: string | null
          skill_assessment_id: string | null
          sort_order: number
          status: string
          supporter: string | null
          target_outcome: string | null
          updated_at: string
        }
        Insert: {
          action_description: string
          action_type?: string
          created_at?: string
          deadline?: string | null
          evidence?: string | null
          form_id: string
          id?: string
          pdca_checkpoint?: string | null
          progress_note?: string | null
          skill_assessment_id?: string | null
          sort_order?: number
          status?: string
          supporter?: string | null
          target_outcome?: string | null
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          deadline?: string | null
          evidence?: string | null
          form_id?: string
          id?: string
          pdca_checkpoint?: string | null
          progress_note?: string | null
          skill_assessment_id?: string | null
          sort_order?: number
          status?: string
          supporter?: string | null
          target_outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_actions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_actions_skill_assessment_id_fkey"
            columns: ["skill_assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evaluation_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_type: string
          description: string | null
          end_date: string
          id: string
          late_penalty_points: number
          name: string
          start_date: string
          status: Database["public"]["Enums"]["evaluation_status"]
          submission_deadline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_type?: string
          description?: string | null
          end_date: string
          id?: string
          late_penalty_points?: number
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          submission_deadline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_type?: string
          description?: string | null
          end_date?: string
          id?: string
          late_penalty_points?: number
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          submission_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      form_ai_actions_v2: {
        Row: {
          actual_result: string | null
          ai_action_text: string
          created_at: string
          deadline: string | null
          evidence_expected: string | null
          expected_result: string | null
          form_id: string
          id: string
          linked_attitude_priority_id: string | null
          linked_skill_priority_id: string | null
          manager_review: string | null
          requested_support: string | null
          row_no: number
          status: string
          unlinked_reason: string | null
          updated_at: string
        }
        Insert: {
          actual_result?: string | null
          ai_action_text: string
          created_at?: string
          deadline?: string | null
          evidence_expected?: string | null
          expected_result?: string | null
          form_id: string
          id?: string
          linked_attitude_priority_id?: string | null
          linked_skill_priority_id?: string | null
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          status?: string
          unlinked_reason?: string | null
          updated_at?: string
        }
        Update: {
          actual_result?: string | null
          ai_action_text?: string
          created_at?: string
          deadline?: string | null
          evidence_expected?: string | null
          expected_result?: string | null
          form_id?: string
          id?: string
          linked_attitude_priority_id?: string | null
          linked_skill_priority_id?: string | null
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          status?: string
          unlinked_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_ai_actions_v2_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_ai_actions_v2_linked_attitude_priority_id_fkey"
            columns: ["linked_attitude_priority_id"]
            isOneToOne: false
            referencedRelation: "form_attitude_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_ai_actions_v2_linked_skill_priority_id_fkey"
            columns: ["linked_skill_priority_id"]
            isOneToOne: false
            referencedRelation: "form_skill_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      form_attitude_actions: {
        Row: {
          action_text: string
          actual_result: string | null
          attitude_priority_id: string
          created_at: string
          deadline: string | null
          expected_evidence: string | null
          form_id: string
          foundation_pillar: string | null
          id: string
          manager_review: string | null
          requested_support: string | null
          row_no: number
          status: string
          updated_at: string
        }
        Insert: {
          action_text: string
          actual_result?: string | null
          attitude_priority_id: string
          created_at?: string
          deadline?: string | null
          expected_evidence?: string | null
          form_id: string
          foundation_pillar?: string | null
          id?: string
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          status?: string
          updated_at?: string
        }
        Update: {
          action_text?: string
          actual_result?: string | null
          attitude_priority_id?: string
          created_at?: string
          deadline?: string | null
          expected_evidence?: string | null
          form_id?: string
          foundation_pillar?: string | null
          id?: string
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_attitude_actions_attitude_priority_id_fkey"
            columns: ["attitude_priority_id"]
            isOneToOne: false
            referencedRelation: "form_attitude_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_attitude_actions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_attitude_priorities: {
        Row: {
          attitude_dimension_id: number
          attitude_name: string
          created_at: string
          current_status: string | null
          desired_status: string | null
          employee_comment: string | null
          evidence: string | null
          form_id: string
          id: string
          improvement_goal: string | null
          issue_summary: string | null
          manager_comment: string | null
          manager_status: string | null
          priority_order: number
          self_status: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attitude_dimension_id: number
          attitude_name: string
          created_at?: string
          current_status?: string | null
          desired_status?: string | null
          employee_comment?: string | null
          evidence?: string | null
          form_id: string
          id?: string
          improvement_goal?: string | null
          issue_summary?: string | null
          manager_comment?: string | null
          manager_status?: string | null
          priority_order?: number
          self_status?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attitude_dimension_id?: number
          attitude_name?: string
          created_at?: string
          current_status?: string | null
          desired_status?: string | null
          employee_comment?: string | null
          evidence?: string | null
          form_id?: string
          id?: string
          improvement_goal?: string | null
          issue_summary?: string | null
          manager_comment?: string | null
          manager_status?: string | null
          priority_order?: number
          self_status?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_attitude_priorities_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_previous_action_reviews: {
        Row: {
          action_text: string | null
          actual_result: string | null
          created_at: string
          employee_note: string | null
          evidence: string | null
          expected_result: string | null
          form_id: string
          id: string
          is_extra: boolean
          manager_note: string | null
          row_no: number
          self_status: string
          source_action_id: string | null
          source_action_type: string
          source_form_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action_text?: string | null
          actual_result?: string | null
          created_at?: string
          employee_note?: string | null
          evidence?: string | null
          expected_result?: string | null
          form_id: string
          id?: string
          is_extra?: boolean
          manager_note?: string | null
          row_no?: number
          self_status?: string
          source_action_id?: string | null
          source_action_type: string
          source_form_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_text?: string | null
          actual_result?: string | null
          created_at?: string
          employee_note?: string | null
          evidence?: string | null
          expected_result?: string | null
          form_id?: string
          id?: string
          is_extra?: boolean
          manager_note?: string | null
          row_no?: number
          self_status?: string
          source_action_id?: string | null
          source_action_type?: string
          source_form_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_skill_actions: {
        Row: {
          action_text: string
          action_type: string
          actual_result: string | null
          created_at: string
          deadline: string | null
          evidence_expected: string | null
          expected_result: string | null
          form_id: string
          id: string
          manager_review: string | null
          requested_support: string | null
          row_no: number
          skill_priority_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action_text: string
          action_type?: string
          actual_result?: string | null
          created_at?: string
          deadline?: string | null
          evidence_expected?: string | null
          expected_result?: string | null
          form_id: string
          id?: string
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          skill_priority_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_text?: string
          action_type?: string
          actual_result?: string | null
          created_at?: string
          deadline?: string | null
          evidence_expected?: string | null
          expected_result?: string | null
          form_id?: string
          id?: string
          manager_review?: string | null
          requested_support?: string | null
          row_no?: number
          skill_priority_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_skill_actions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_skill_actions_skill_priority_id_fkey"
            columns: ["skill_priority_id"]
            isOneToOne: false
            referencedRelation: "form_skill_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      form_skill_priorities: {
        Row: {
          created_at: string
          current_level: number | null
          form_id: string
          gap_level: number | null
          id: string
          priority_order: number
          reason_text: string | null
          skill_id: string
          source_type: string
          status: string
          target_level: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: number | null
          form_id: string
          gap_level?: number | null
          id?: string
          priority_order?: number
          reason_text?: string | null
          skill_id: string
          source_type?: string
          status?: string
          target_level?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: number | null
          form_id?: string
          gap_level?: number | null
          id?: string
          priority_order?: number
          reason_text?: string | null
          skill_id?: string
          source_type?: string
          status?: string
          target_level?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_skill_priorities_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_skill_priorities_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          ai_portrait: string | null
          ai_portrait_generated_at: string | null
          created_at: string
          cycle_id: string
          director_overall_review: Json | null
          employee_comment: string | null
          employee_id: string
          first_approved_at: string | null
          first_reviewed_at: string | null
          first_submitted_at: string | null
          id: string
          manager_comment: string | null
          manager_overall_review: Json | null
          needs_manager_review_update: boolean
          one_on_one_answers: Json
          one_on_one_enabled: boolean
          overall_score: number | null
          pgd_comment: string | null
          pgd_overall_review: Json | null
          pgd_review_status: string
          pgd_reviewed_at: string | null
          return_reason: string | null
          return_target: string | null
          returned_at: string | null
          returned_by: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          ai_portrait?: string | null
          ai_portrait_generated_at?: string | null
          created_at?: string
          cycle_id: string
          director_overall_review?: Json | null
          employee_comment?: string | null
          employee_id: string
          first_approved_at?: string | null
          first_reviewed_at?: string | null
          first_submitted_at?: string | null
          id?: string
          manager_comment?: string | null
          manager_overall_review?: Json | null
          needs_manager_review_update?: boolean
          one_on_one_answers?: Json
          one_on_one_enabled?: boolean
          overall_score?: number | null
          pgd_comment?: string | null
          pgd_overall_review?: Json | null
          pgd_review_status?: string
          pgd_reviewed_at?: string | null
          return_reason?: string | null
          return_target?: string | null
          returned_at?: string | null
          returned_by?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_portrait?: string | null
          ai_portrait_generated_at?: string | null
          created_at?: string
          cycle_id?: string
          director_overall_review?: Json | null
          employee_comment?: string | null
          employee_id?: string
          first_approved_at?: string | null
          first_reviewed_at?: string | null
          first_submitted_at?: string | null
          id?: string
          manager_comment?: string | null
          manager_overall_review?: Json | null
          needs_manager_review_update?: boolean
          one_on_one_answers?: Json
          one_on_one_enabled?: boolean
          overall_score?: number | null
          pgd_comment?: string | null
          pgd_overall_review?: Json | null
          pgd_review_status?: string
          pgd_reviewed_at?: string | null
          return_reason?: string | null
          return_target?: string | null
          returned_at?: string | null
          returned_by?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form04_reports: {
        Row: {
          created_at: string
          cycle_id: string
          department_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          report_name: string
          summary: Json | null
          total_employees: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          department_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_name: string
          summary?: Json | null
          total_employees?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          department_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_name?: string
          summary?: Json | null
          total_employees?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form04_reports_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form04_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      form04_staff_classifications: {
        Row: {
          classification: Database["public"]["Enums"]["staff_classification"]
          created_at: string
          employee_id: string
          id: string
          note: string | null
          performance_score: number | null
          report_id: string
          skill_score: number | null
          updated_at: string
        }
        Insert: {
          classification: Database["public"]["Enums"]["staff_classification"]
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          performance_score?: number | null
          report_id: string
          skill_score?: number | null
          updated_at?: string
        }
        Update: {
          classification?: Database["public"]["Enums"]["staff_classification"]
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          performance_score?: number | null
          report_id?: string
          skill_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form04_staff_classifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form04_staff_classifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "form04_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_logs: {
        Row: {
          blocker_note: string | null
          card_id: string
          created_at: string
          created_by: string | null
          current_result: string | null
          evidence_text: string | null
          evidence_url: string | null
          id: string
          log_type: string
          new_status: string | null
          next_step: string | null
          old_status: string | null
          profile_id: string
          progress_note: string | null
          progress_percent: number | null
          support_needed: string | null
        }
        Insert: {
          blocker_note?: string | null
          card_id: string
          created_at?: string
          created_by?: string | null
          current_result?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          log_type: string
          new_status?: string | null
          next_step?: string | null
          old_status?: string | null
          profile_id: string
          progress_note?: string | null
          progress_percent?: number | null
          support_needed?: string | null
        }
        Update: {
          blocker_note?: string | null
          card_id?: string
          created_at?: string
          created_by?: string | null
          current_result?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          log_type?: string
          new_status?: string | null
          next_step?: string | null
          old_status?: string | null
          profile_id?: string
          progress_note?: string | null
          progress_percent?: number | null
          support_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          archived_at: string | null
          archived_reason: string | null
          attitude_dimension_id: number | null
          completed_at: string | null
          completion_status: string
          created_at: string
          cycle_id: string | null
          deadline: string | null
          form_id: string
          id: string
          is_active: boolean
          kanban_status: string
          last_progress_at: string | null
          learning_mode: string | null
          manager_confirmed_at: string | null
          manager_confirmed_by: string | null
          next_update_due_at: string | null
          profile_id: string
          progress_percent: number
          skill_id: string | null
          source_action_id: string | null
          source_table: string
          source_type: string
          started_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_reason?: string | null
          attitude_dimension_id?: number | null
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          cycle_id?: string | null
          deadline?: string | null
          form_id: string
          id?: string
          is_active?: boolean
          kanban_status?: string
          last_progress_at?: string | null
          learning_mode?: string | null
          manager_confirmed_at?: string | null
          manager_confirmed_by?: string | null
          next_update_due_at?: string | null
          profile_id: string
          progress_percent?: number
          skill_id?: string | null
          source_action_id?: string | null
          source_table: string
          source_type: string
          started_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_reason?: string | null
          attitude_dimension_id?: number | null
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          cycle_id?: string | null
          deadline?: string | null
          form_id?: string
          id?: string
          is_active?: boolean
          kanban_status?: string
          last_progress_at?: string | null
          learning_mode?: string | null
          manager_confirmed_at?: string | null
          manager_confirmed_by?: string | null
          next_update_due_at?: string | null
          profile_id?: string
          progress_percent?: number
          skill_id?: string | null
          source_action_id?: string | null
          source_table?: string
          source_type?: string
          started_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_items: {
        Row: {
          actual_value: string | null
          created_at: string
          evidence: string | null
          form_id: string
          id: string
          kpi_name: string
          manager_note: string | null
          score: number | null
          sort_order: number
          target_value: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          actual_value?: string | null
          created_at?: string
          evidence?: string | null
          form_id: string
          id?: string
          kpi_name: string
          manager_note?: string | null
          score?: number | null
          sort_order?: number
          target_value?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          actual_value?: string | null
          created_at?: string
          evidence?: string | null
          form_id?: string
          id?: string
          kpi_name?: string
          manager_note?: string | null
          score?: number | null
          sort_order?: number
          target_value?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_campaign_targets: {
        Row: {
          campaign_id: string
          created_at: string
          department_id: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "learning_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_campaign_targets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_campaign_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          skill_id: string
          start_date: string
          target_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          skill_id: string
          start_date: string
          target_level: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          skill_id?: string
          start_date?: string
          target_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_campaigns_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_campaigns_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      management_scopes: {
        Row: {
          created_at: string
          department_id: string | null
          granted_by: string | null
          grantee_profile_id: string
          id: string
          is_active: boolean
          purpose: string
          scope_type: string
          staff_profile_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          granted_by?: string | null
          grantee_profile_id: string
          id?: string
          is_active?: boolean
          purpose?: string
          scope_type: string
          staff_profile_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          granted_by?: string | null
          grantee_profile_id?: string
          id?: string
          is_active?: boolean
          purpose?: string
          scope_type?: string
          staff_profile_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_scopes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_scopes_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_scopes_grantee_profile_id_fkey"
            columns: ["grantee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_scopes_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_pairs: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          id: string
          mentee_profile_id: string
          mentor_profile_id: string
          note: string | null
          skill_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          id?: string
          mentee_profile_id: string
          mentor_profile_id: string
          note?: string | null
          skill_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          id?: string
          mentee_profile_id?: string
          mentor_profile_id?: string
          note?: string | null
          skill_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_pairs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_pairs_mentee_profile_id_fkey"
            columns: ["mentee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_pairs_mentor_profile_id_fkey"
            columns: ["mentor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_pairs_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_questions: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          is_active: boolean
          question_key: string
          question_text: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          is_active?: boolean
          question_key: string
          question_text: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          is_active?: boolean
          question_key?: string
          question_text?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_questions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_core_skills: {
        Row: {
          advanced_level: number
          created_at: string
          id: string
          minimum_level: number
          position_id: string
          skill_id: string
          sort_order: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          advanced_level?: number
          created_at?: string
          id?: string
          minimum_level?: number
          position_id: string
          skill_id: string
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          advanced_level?: number
          created_at?: string
          id?: string
          minimum_level?: number
          position_id?: string
          skill_id?: string
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "position_core_skills_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_core_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      position_to_vtb_group: {
        Row: {
          position_id: string
          vtb_position_group: string
        }
        Insert: {
          position_id: string
          vtb_position_group: string
        }
        Update: {
          position_id?: string
          vtb_position_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_to_vtb_group_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string | null
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          director_id: string | null
          email: string | null
          employee_code: string | null
          full_name: string
          hobbies: string | null
          id: string
          join_date: string | null
          manager_id: string | null
          note: string | null
          personal_email: string | null
          pgd_id: string | null
          phone: string | null
          position: string | null
          position_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          director_id?: string | null
          email?: string | null
          employee_code?: string | null
          full_name: string
          hobbies?: string | null
          id?: string
          join_date?: string | null
          manager_id?: string | null
          note?: string | null
          personal_email?: string | null
          pgd_id?: string | null
          phone?: string | null
          position?: string | null
          position_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          director_id?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string
          hobbies?: string | null
          id?: string
          join_date?: string | null
          manager_id?: string | null
          note?: string | null
          personal_email?: string | null
          pgd_id?: string | null
          phone?: string | null
          position?: string | null
          position_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pgd_id_fkey"
            columns: ["pgd_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          elapsed_ms: number
          id: string
          is_correct: boolean
          points: number
          question_id: string
          selected_index: number | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          elapsed_ms: number
          id?: string
          is_correct?: boolean
          points?: number
          question_id: string
          selected_index?: number | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          elapsed_ms?: number
          id?: string
          is_correct?: boolean
          points?: number
          question_id?: string
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_count: number
          current_question_id: string | null
          current_question_served_at: string | null
          id: string
          pledge_accepted_at: string | null
          profile_id: string
          quiz_id: string
          score: number
          started_at: string
          status: string
          total_questions: number
          total_time_ms: number
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number
          current_question_id?: string | null
          current_question_served_at?: string | null
          id?: string
          pledge_accepted_at?: string | null
          profile_id: string
          quiz_id: string
          score?: number
          started_at?: string
          status?: string
          total_questions?: number
          total_time_ms?: number
        }
        Update: {
          completed_at?: string | null
          correct_count?: number
          current_question_id?: string | null
          current_question_served_at?: string | null
          id?: string
          pledge_accepted_at?: string | null
          profile_id?: string
          quiz_id?: string
          score?: number
          started_at?: string
          status?: string
          total_questions?: number
          total_time_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_badge_awards: {
        Row: {
          awarded_at: string
          badge_id: string
          celebrated_at: string | null
          id: string
          profile_id: string
          quiz_id: string | null
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          celebrated_at?: string | null
          id?: string
          profile_id: string
          quiz_id?: string | null
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          celebrated_at?: string | null
          id?: string
          profile_id?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "quiz_badge_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_badge_awards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_badge_awards_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_badge_catalog: {
        Row: {
          code: string
          created_at: string
          criteria: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      quiz_campaign_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          elapsed_ms: number
          id: string
          is_correct: boolean
          points: number
          question_id: string
          selected_index: number | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          elapsed_ms: number
          id?: string
          is_correct?: boolean
          points?: number
          question_id: string
          selected_index?: number | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          elapsed_ms?: number
          id?: string
          is_correct?: boolean
          points?: number
          question_id?: string
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_campaign_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_campaign_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_campaign_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_campaign_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_campaign_attempts: {
        Row: {
          campaign_id: string
          completed_at: string | null
          correct_count: number
          current_pos: number
          current_served_at: string | null
          id: string
          pledge_accepted_at: string | null
          option_orders: Json
          profile_id: string
          question_ids: string[]
          score: number
          started_at: string
          status: string
          total_questions: number
          total_time_ms: number
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          correct_count?: number
          current_pos?: number
          current_served_at?: string | null
          id?: string
          pledge_accepted_at?: string | null
          option_orders?: Json
          profile_id: string
          question_ids: string[]
          score?: number
          started_at?: string
          status?: string
          total_questions?: number
          total_time_ms?: number
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          correct_count?: number
          current_pos?: number
          current_served_at?: string | null
          id?: string
          pledge_accepted_at?: string | null
          option_orders?: Json
          profile_id?: string
          question_ids?: string[]
          score?: number
          started_at?: string
          status?: string
          total_questions?: number
          total_time_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_campaign_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "quiz_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_campaign_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_campaign_initiator_depts: {
        Row: {
          created_at: string
          department_id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          note?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_campaign_initiator_depts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_campaign_questions: {
        Row: {
          campaign_id: string
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          sort_order: number
          statement: string
          time_seconds: number | null
        }
        Insert: {
          campaign_id: string
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          sort_order?: number
          statement: string
          time_seconds?: number | null
        }
        Update: {
          campaign_id?: string
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          sort_order?: number
          statement?: string
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_campaign_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "quiz_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_campaigns: {
        Row: {
          anonymous_results: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          department_id: string
          description: string | null
          end_date: string | null
          id: string
          per_question_seconds: number
          require_pledge: boolean
          question_pool_size: number | null
          rejected_reason: string | null
          shuffle_options: boolean
          skill_id: string | null
          source_ref: string | null
          start_date: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          anonymous_results?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          department_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          per_question_seconds?: number
          require_pledge?: boolean
          question_pool_size?: number | null
          rejected_reason?: string | null
          shuffle_options?: boolean
          skill_id?: string | null
          source_ref?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          anonymous_results?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          department_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          per_question_seconds?: number
          require_pledge?: boolean
          question_pool_size?: number | null
          rejected_reason?: string | null
          shuffle_options?: boolean
          skill_id?: string | null
          source_ref?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_campaigns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_campaigns_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_pledge_items: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          quiz_id: string
          sort_order: number
          statement: string
          time_seconds: number | null
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          quiz_id: string
          sort_order?: number
          statement: string
          time_seconds?: number | null
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          quiz_id?: string
          sort_order?: number
          statement?: string
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_streak_freezes: {
        Row: {
          earned_at: string
          earned_reason: string
          id: string
          profile_id: string
          used_week_start: string | null
        }
        Insert: {
          earned_at?: string
          earned_reason?: string
          id?: string
          profile_id: string
          used_week_start?: string | null
        }
        Update: {
          earned_at?: string
          earned_reason?: string
          id?: string
          profile_id?: string
          used_week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_streak_freezes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          department_id: string
          description: string | null
          id: string
          per_question_seconds: number
          require_pledge: boolean
          skill_id: string | null
          source_ref: string | null
          status: string
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          department_id: string
          description?: string | null
          id?: string
          per_question_seconds?: number
          require_pledge?: boolean
          skill_id?: string | null
          source_ref?: string | null
          status?: string
          title: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string
          description?: string | null
          id?: string
          per_question_seconds?: number
          require_pledge?: boolean
          skill_id?: string | null
          source_ref?: string | null
          status?: string
          title?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_items: {
        Row: {
          created_at: string
          date_achieved: string | null
          description: string | null
          evidence_url: string | null
          form_id: string
          id: string
          recognition_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_achieved?: string | null
          description?: string | null
          evidence_url?: string | null
          form_id: string
          id?: string
          recognition_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_achieved?: string | null
          description?: string | null
          evidence_url?: string | null
          form_id?: string
          id?: string
          recognition_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_answers: {
        Row: {
          answer: string | null
          created_at: string
          form_id: string
          id: string
          question_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          form_id: string
          id?: string
          question_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          form_id?: string
          id?: string
          question_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_answers_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          created_at: string
          created_auth_user_id: string | null
          created_profile_id: string | null
          department_id: string | null
          email: string
          full_name: string
          id: string
          note: string | null
          phone_number: string
          position_id: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          security_code_entered: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_auth_user_id?: string | null
          created_profile_id?: string | null
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          note?: string | null
          phone_number: string
          position_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_code_entered: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_auth_user_id?: string | null
          created_profile_id?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          note?: string | null
          phone_number?: string
          position_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_code_entered?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_assessments: {
        Row: {
          created_at: string
          current_level: number | null
          employee_comment: string | null
          evidence: string | null
          form_id: string
          gap: number | null
          id: string
          idp_target_level: number | null
          is_core: boolean
          is_idp_selected: boolean
          manager_assessed_level: number | null
          manager_l0: boolean
          manager_note: string | null
          required_level: number | null
          self_assessed_level: number | null
          self_l0: boolean
          skill_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: number | null
          employee_comment?: string | null
          evidence?: string | null
          form_id: string
          gap?: number | null
          id?: string
          idp_target_level?: number | null
          is_core?: boolean
          is_idp_selected?: boolean
          manager_assessed_level?: number | null
          manager_l0?: boolean
          manager_note?: string | null
          required_level?: number | null
          self_assessed_level?: number | null
          self_l0?: boolean
          skill_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: number | null
          employee_comment?: string | null
          evidence?: string | null
          form_id?: string
          gap?: number | null
          id?: string
          idp_target_level?: number | null
          is_core?: boolean
          is_idp_selected?: boolean
          manager_assessed_level?: number | null
          manager_l0?: boolean
          manager_note?: string | null
          required_level?: number | null
          self_assessed_level?: number | null
          self_l0?: boolean
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_catalog: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          level1_description: string | null
          level2_description: string | null
          level3_description: string | null
          level4_description: string | null
          name: string
          skill_group: string
          sort_order: number
          updated_at: string
          upskill_l0_l1: string | null
          upskill_l1_l2: string | null
          upskill_l2_l3: string | null
          upskill_l3_l4: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          level1_description?: string | null
          level2_description?: string | null
          level3_description?: string | null
          level4_description?: string | null
          name: string
          skill_group: string
          sort_order?: number
          updated_at?: string
          upskill_l0_l1?: string | null
          upskill_l1_l2?: string | null
          upskill_l2_l3?: string | null
          upskill_l3_l4?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          level1_description?: string | null
          level2_description?: string | null
          level3_description?: string | null
          level4_description?: string | null
          name?: string
          skill_group?: string
          sort_order?: number
          updated_at?: string
          upskill_l0_l1?: string | null
          upskill_l1_l2?: string | null
          upskill_l2_l3?: string | null
          upskill_l3_l4?: string | null
        }
        Relationships: []
      }
      skill_criteria_responses: {
        Row: {
          answer: number
          created_at: string
          criterion_id: string
          evidence: string | null
          form_id: string
          id: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          answer: number
          created_at?: string
          criterion_id: string
          evidence?: string | null
          form_id: string
          id?: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          answer?: number
          created_at?: string
          criterion_id?: string
          evidence?: string | null
          form_id?: string
          id?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_criteria_responses_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "skill_level_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_criteria_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_criteria_responses_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_growth_stage_images: {
        Row: {
          created_at: string
          id: string
          image_name: string | null
          image_url: string
          is_active: boolean
          stage_no: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_name?: string | null
          image_url: string
          is_active?: boolean
          stage_no: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_name?: string | null
          image_url?: string
          is_active?: boolean
          stage_no?: number
          updated_at?: string
        }
        Relationships: []
      }
      skill_level_achievements: {
        Row: {
          achieved_at: string
          celebrated_at: string | null
          cycle_id: string | null
          form_id: string | null
          id: string
          level_no: number
          profile_id: string
          skill_id: string
        }
        Insert: {
          achieved_at?: string
          celebrated_at?: string | null
          cycle_id?: string | null
          form_id?: string | null
          id?: string
          level_no: number
          profile_id: string
          skill_id: string
        }
        Update: {
          achieved_at?: string
          celebrated_at?: string | null
          cycle_id?: string | null
          form_id?: string | null
          id?: string
          level_no?: number
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_level_achievements_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_level_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_level_achievements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_level_criteria: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_gate: boolean
          level_no: number
          requires_evidence: boolean
          skill_id: string
          sort_order: number
          statement: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_gate?: boolean
          level_no: number
          requires_evidence?: boolean
          skill_id: string
          sort_order?: number
          statement: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_gate?: boolean
          level_no?: number
          requires_evidence?: boolean
          skill_id?: string
          sort_order?: number
          statement?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_level_criteria_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_level_images: {
        Row: {
          created_at: string
          id: string
          image_name: string | null
          image_url: string
          is_active: boolean
          level_no: number
          skill_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_name?: string | null
          image_url: string
          is_active?: boolean
          level_no: number
          skill_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_name?: string | null
          image_url?: string
          is_active?: boolean
          level_no?: number
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_level_images_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_groups: {
        Row: {
          code: string | null
          core_skill_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          core_skill_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          core_skill_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_star_classifications: {
        Row: {
          approval_status: Database["public"]["Enums"]["star_approval_status"]
          approved_at: string | null
          approver_id: string | null
          created_at: string
          cycle_id: string
          direction_text: string | null
          employee_id: string
          evaluator_id: string | null
          evaluator_level: Database["public"]["Enums"]["star_evaluator_level"]
          form_id: string | null
          id: string
          override_by: string | null
          override_reason: string | null
          reason_text: string | null
          star_group: Database["public"]["Enums"]["star_group"] | null
          updated_at: string
          visible_to_employee: boolean
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["star_approval_status"]
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          cycle_id: string
          direction_text?: string | null
          employee_id: string
          evaluator_id?: string | null
          evaluator_level?: Database["public"]["Enums"]["star_evaluator_level"]
          form_id?: string | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          reason_text?: string | null
          star_group?: Database["public"]["Enums"]["star_group"] | null
          updated_at?: string
          visible_to_employee?: boolean
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["star_approval_status"]
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          cycle_id?: string
          direction_text?: string | null
          employee_id?: string
          evaluator_id?: string | null
          evaluator_level?: Database["public"]["Enums"]["star_evaluator_level"]
          form_id?: string | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          reason_text?: string | null
          star_group?: Database["public"]["Enums"]["star_group"] | null
          updated_at?: string
          visible_to_employee?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "staff_star_classifications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_star_classifications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_star_classifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_star_classifications_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_star_classifications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_star_classifications_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      training_proposals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          development_action_id: string | null
          employee_id: string
          estimated_cost: number | null
          id: string
          note: string | null
          proposed_date: string | null
          provider: string | null
          status: string
          training_name: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          development_action_id?: string | null
          employee_id: string
          estimated_cost?: number | null
          id?: string
          note?: string | null
          proposed_date?: string | null
          provider?: string | null
          status?: string
          training_name: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          development_action_id?: string | null
          employee_id?: string
          estimated_cost?: number | null
          id?: string
          note?: string | null
          proposed_date?: string | null
          provider?: string | null
          status?: string
          training_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_proposals_development_action_id_fkey"
            columns: ["development_action_id"]
            isOneToOne: false
            referencedRelation: "development_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_proposals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vtb_course_position_groups: {
        Row: {
          course_id: string
          position_group: string
        }
        Insert: {
          course_id: string
          position_group: string
        }
        Update: {
          course_id?: string
          position_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "vtb_course_position_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vtb_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      vtb_course_skills: {
        Row: {
          course_id: string
          created_at: string
          relevance: string
          skill_id: string
          target_level_min: number
        }
        Insert: {
          course_id: string
          created_at?: string
          relevance?: string
          skill_id: string
          target_level_min?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          relevance?: string
          skill_id?: string
          target_level_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "vtb_course_skills_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vtb_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vtb_course_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      vtb_courses: {
        Row: {
          code: string
          competency_type: string | null
          content: string | null
          created_at: string
          duration_days: number | null
          format: string | null
          id: string
          internal_note: string | null
          is_active: boolean
          name: string
          objective: string | null
          short_name: string | null
          source: string
          updated_at: string
        }
        Insert: {
          code: string
          competency_type?: string | null
          content?: string | null
          created_at?: string
          duration_days?: number | null
          format?: string | null
          id?: string
          internal_note?: string | null
          is_active?: boolean
          name: string
          objective?: string | null
          short_name?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          code?: string
          competency_type?: string | null
          content?: string | null
          created_at?: string
          duration_days?: number | null
          format?: string | null
          id?: string
          internal_note?: string | null
          is_active?: boolean
          name?: string
          objective?: string | null
          short_name?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_email_overview: { Args: never; Returns: Json }
      can_observe_profile: {
        Args: { _target: string }
        Returns: boolean
      }
      can_record_profile: {
        Args: { _target: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      confirm_kanban_completion: {
        Args: { _card_id: string; _note?: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_campaign_progress: {
        Args: { _campaign_id: string }
        Returns: {
          achieved: number
          total_members: number
        }[]
      }
      get_council_subject_report: {
        Args: { p_subject_id: string }
        Returns: Json
      }
      set_council_results_published: {
        Args: { p_round_id: string; p_published: boolean }
        Returns: undefined
      }
      get_my_department_id: { Args: never; Returns: string }
      get_observable_profiles: {
        Args: never
        Returns: {
          id: string
          full_name: string
          employee_code: string | null
          department_id: string | null
          department_name: string | null
          position_title: string | null
        }[]
      }
      get_my_pgd_scope_dept_ids: { Args: never; Returns: string[] }
      get_my_profile_id: { Args: never; Returns: string }
      get_my_supervisor_ids: { Args: never; Returns: string[] }
      hard_delete_staff: { Args: { p_profile_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_council_member: { Args: never; Returns: boolean }
      is_tcth_leader: { Args: { _user_id: string }; Returns: boolean }
      kanban_upsert_card: {
        Args: {
          _attitude_dimension_id: number
          _deadline: string
          _form_id: string
          _learning_mode: string
          _skill_id: string
          _source_action_id: string
          _source_table: string
          _source_type: string
          _title: string
        }
        Returns: string
      }
      move_kanban_card: {
        Args: { _card_id: string; _new_status: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      quiz_answer_question: {
        Args: { _attempt_id: string; _selected_index: number | null }
        Returns: Json
      }
      quiz_apply_streak_freezes: { Args: never; Returns: number }
      quiz_campaign_answer: {
        Args: { _attempt_id: string; _selected_index: number | null }
        Returns: Json
      }
      quiz_campaign_get_results: { Args: { _campaign_id: string }; Returns: Json }
      quiz_campaign_get_review: { Args: { _attempt_id: string }; Returns: Json }
      quiz_campaign_is_open: { Args: { _campaign_id: string }; Returns: boolean }
      quiz_campaign_start_attempt: {
        Args: { _campaign_id: string; _pledge_accepted?: boolean }
        Returns: Json
      }
      quiz_expire_stale_attempts: { Args: never; Returns: number }
      quiz_get_attempt_review: { Args: { _attempt_id: string }; Returns: Json }
      quiz_get_branch_overview: {
        Args: { _week_start?: string }
        Returns: Json
      }
      quiz_get_department_streaks: { Args: never; Returns: Json }
      quiz_get_my_streak: { Args: never; Returns: Json }
      quiz_get_ranking: { Args: { _quiz_id: string }; Returns: Json }
      quiz_start_attempt: {
        Args: { _quiz_id: string; _pledge_accepted?: boolean }
        Returns: Json
      }
      quiz_week_start: { Args: { _ts?: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_kanban_completion: {
        Args: {
          _card_id: string
          _current_result: string
          _evidence_text: string
          _evidence_url?: string
        }
        Returns: undefined
      }
      return_kanban_card: {
        Args: { _card_id: string; _reason: string }
        Returns: undefined
      }
      save_evaluation_children: {
        Args: {
          p_ai_actions?: Json
          p_attitude_actions?: Json
          p_attitude_priorities?: Json
          p_form_id: string
          p_skill_actions?: Json
          p_skill_assessments?: Json
          p_skill_priorities?: Json
        }
        Returns: undefined
      }
      suggest_skill_mentors: {
        Args: { _cycle_id: string; _min_level?: number; _skill_id: string }
        Returns: {
          active_mentees: number
          department_id: string
          department_name: string
          full_name: string
          profile_id: string
          skill_level: number
        }[]
      }
      update_kanban_progress: {
        Args: {
          _blocker_note?: string
          _card_id: string
          _current_result?: string
          _evidence_text?: string
          _evidence_url?: string
          _next_step?: string
          _progress_note: string
          _progress_percent: number
          _support_needed?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "employee"
        | "manager"
        | "pgd"
        | "tcth_admin"
        | "system_admin"
        | "bgd"
      evaluation_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "reviewed"
        | "approved"
        | "closed"
        | "returned"
      registration_status: "pending" | "approved" | "rejected"
      staff_classification: "sao_mai" | "sao_khue" | "sao_bang" | "sao_hom"
      star_approval_status: "pending" | "approved" | "rejected"
      star_evaluator_level: "manager" | "pgd" | "director"
      star_group: "sao_mai" | "sao_khue" | "sao_bang" | "sao_hom"
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
      app_role: [
        "employee",
        "manager",
        "pgd",
        "tcth_admin",
        "system_admin",
        "bgd",
      ],
      evaluation_status: [
        "draft",
        "in_progress",
        "submitted",
        "reviewed",
        "approved",
        "closed",
        "returned",
      ],
      registration_status: ["pending", "approved", "rejected"],
      staff_classification: ["sao_mai", "sao_khue", "sao_bang", "sao_hom"],
      star_approval_status: ["pending", "approved", "rejected"],
      star_evaluator_level: ["manager", "pgd", "director"],
      star_group: ["sao_mai", "sao_khue", "sao_bang", "sao_hom"],
    },
  },
} as const

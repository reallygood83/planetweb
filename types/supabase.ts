export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          school_name: string | null
          api_key_hint: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          school_name?: string | null
          api_key_hint?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          school_name?: string | null
          api_key_hint?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_plans: {
        Row: {
          id: string
          user_id: string
          subject: string
          grade: string
          semester: string
          evaluations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          grade: string
          semester: string
          evaluations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          grade?: string
          semester?: string
          evaluations?: Json
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          user_id: string
          class_name: string
          grade: string
          semester: string
          teacher: string | null
          students: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          class_name: string
          grade: string
          semester: string
          teacher?: string | null
          students?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          class_name?: string
          grade?: string
          semester?: string
          teacher?: string | null
          students?: Json
          created_at?: string
          updated_at?: string
        }
      }
      student_evaluations: {
        Row: {
          id: string
          user_id: string
          class_id: string
          student_name: string
          subject: string
          responses: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          class_id: string
          student_name: string
          subject: string
          responses?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          class_id?: string
          student_name?: string
          subject?: string
          responses?: Json
          created_at?: string
        }
      }
      generated_contents: {
        Row: {
          id: string
          user_id: string
          student_name: string
          class_name: string | null
          content_type: string
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_name: string
          class_name?: string | null
          content_type: string
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_name?: string
          class_name?: string | null
          content_type?: string
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      school_groups: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          school_name: string | null
          creator_id: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          school_name?: string | null
          creator_id: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          school_name?: string | null
          creator_id?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      group_memberships: {
        Row: {
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      shared_contents: {
        Row: {
          id: string
          group_id: string
          user_id: string
          content_type: string
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          content_type: string
          content: Json
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          content_type?: string
          content?: Json
          created_at?: string
        }
      }
      surveys: {
        Row: {
          id: string
          user_id: string
          evaluation_plan_id: string | null
          title: string
          description?: string
          questions: Json
          survey_type?: string
          behavior_criteria?: Json
          is_active: boolean | null
          teacher_id?: string | null
          individual_evaluation_id?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          evaluation_plan_id?: string | null
          title: string
          description?: string
          questions?: Json
          survey_type?: string
          behavior_criteria?: Json
          is_active?: boolean | null
          teacher_id?: string | null
          individual_evaluation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          evaluation_plan_id?: string | null
          title?: string
          description?: string
          questions?: Json
          survey_type?: string
          behavior_criteria?: Json
          is_active?: boolean | null
          teacher_id?: string | null
          individual_evaluation_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      survey_responses: {
        Row: {
          id: string
          survey_id: string
          student_name: string
          class_name: string
          responses: Json
          submitted_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          student_name: string
          class_name: string
          responses?: Json
          submitted_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          student_name?: string
          class_name?: string
          responses?: Json
          submitted_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
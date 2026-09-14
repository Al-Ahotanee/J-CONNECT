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
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          created_at: string
          created_by: string
          id: string
          link: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by: string
          id?: string
          link?: string | null
          message: string
          title: string
          type?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string
          id?: string
          link?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          assigned_to: string | null
          created_at: string
          entity_id: string
          entity_title: string
          entity_type: string
          escalated_at: string | null
          id: string
          notes: string | null
          priority: string
          reviewed_at: string | null
          reviewed_by: string | null
          sla_deadline: string | null
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          entity_id: string
          entity_title: string
          entity_type: string
          escalated_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_deadline?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          entity_id?: string
          entity_title?: string
          entity_type?: string
          escalated_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_deadline?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          favicon_url: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          meta_description: string | null
          primary_color: string | null
          secondary_color: string | null
          system_name: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          system_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          system_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      candidate_scores: {
        Row: {
          application_id: string
          category: string
          created_at: string
          id: string
          job_id: string
          max_score: number
          notes: string | null
          score: number
          scorer_id: string
          user_id: string
        }
        Insert: {
          application_id: string
          category?: string
          created_at?: string
          id?: string
          job_id: string
          max_score?: number
          notes?: string | null
          score?: number
          scorer_id: string
          user_id: string
        }
        Update: {
          application_id?: string
          category?: string
          created_at?: string
          id?: string
          job_id?: string
          max_score?: number
          notes?: string | null
          score?: number
          scorer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          enrollment_id: string | null
          id: string
          issued_at: string
          issued_by: string | null
          pdf_url: string | null
          qr_verification_url: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          enrollment_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          pdf_url?: string | null
          qr_verification_url?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          enrollment_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          pdf_url?: string | null
          qr_verification_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      chatroom_members: {
        Row: {
          chatroom_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          chatroom_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          chatroom_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatroom_members_chatroom_id_fkey"
            columns: ["chatroom_id"]
            isOneToOne: false
            referencedRelation: "group_chatrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chatroom_messages: {
        Row: {
          chatroom_id: string
          content: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          user_id: string
        }
        Insert: {
          chatroom_id: string
          content: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chatroom_id?: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatroom_messages_chatroom_id_fkey"
            columns: ["chatroom_id"]
            isOneToOne: false
            referencedRelation: "group_chatrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          benefits: string[] | null
          company_name: string
          company_size: string | null
          cover_image_url: string | null
          created_at: string
          culture: string | null
          description: string | null
          founded_year: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          lga: string | null
          location: string | null
          logo_url: string | null
          rating: number | null
          review_count: number | null
          social_links: Json | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          benefits?: string[] | null
          company_name: string
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string
          culture?: string | null
          description?: string | null
          founded_year?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          lga?: string | null
          location?: string | null
          logo_url?: string | null
          rating?: number | null
          review_count?: number | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          benefits?: string[] | null
          company_name?: string
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string
          culture?: string | null
          description?: string | null
          founded_year?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          lga?: string | null
          location?: string | null
          logo_url?: string | null
          rating?: number | null
          review_count?: number | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      company_reviews: {
        Row: {
          company_id: string
          cons: string | null
          created_at: string
          id: string
          is_current_employee: boolean | null
          pros: string | null
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          cons?: string | null
          created_at?: string
          id?: string
          is_current_employee?: boolean | null
          pros?: string | null
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          cons?: string | null
          created_at?: string
          id?: string
          is_current_employee?: boolean | null
          pros?: string | null
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          lesson_id: string | null
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          lesson_id?: string | null
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          enrolled_count: number | null
          id: string
          instructor_approved: boolean | null
          instructor_id: string | null
          is_free: boolean | null
          is_published: boolean | null
          level: string | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          enrolled_count?: number | null
          id?: string
          instructor_approved?: boolean | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          enrolled_count?: number | null
          id?: string
          instructor_approved?: boolean | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discussion_posts: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          is_pinned: boolean | null
          lesson_id: string | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          lesson_id?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          lesson_id?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          qualification_type: string
          user_id: string
          year_of_graduation: string | null
        }
        Insert: {
          created_at?: string
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          qualification_type: string
          user_id: string
          year_of_graduation?: string | null
        }
        Update: {
          created_at?: string
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          qualification_type?: string
          user_id?: string
          year_of_graduation?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          certificate_url: string | null
          completed: boolean | null
          course_id: string
          created_at: string
          id: string
          progress: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed?: boolean | null
          course_id: string
          created_at?: string
          id?: string
          progress?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed?: boolean | null
          course_id?: string
          created_at?: string
          id?: string
          progress?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chatrooms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          max_members: number | null
          mentor_id: string | null
          name: string
          topic: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_members?: number | null
          mentor_id?: string | null
          name: string
          topic: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_members?: number | null
          mentor_id?: string | null
          name?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chatrooms_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_invitations: {
        Row: {
          application_id: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          recruiter_id: string
          scheduled_at: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          recruiter_id: string
          scheduled_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          recruiter_id?: string
          scheduled_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          custom_answers: Json | null
          documents: Json | null
          id: string
          job_id: string
          resume_url: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          custom_answers?: Json | null
          documents?: Json | null
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          custom_answers?: Json | null
          documents?: Json | null
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          application_id: string
          created_at: string
          id: string
          job_id: string
          offer_details: string | null
          recruiter_id: string
          responded_at: string | null
          salary_offered: string | null
          status: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          job_id: string
          offer_details?: string | null
          recruiter_id: string
          responded_at?: string | null
          salary_offered?: string | null
          status?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          job_id?: string
          offer_details?: string | null
          recruiter_id?: string
          responded_at?: string | null
          salary_offered?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applicants_count: number | null
          company: string
          created_at: string
          custom_questions: Json | null
          deadline: string | null
          description: string
          employment_type: string | null
          experience_level: string | null
          external_url: string | null
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          lga: string | null
          location: string | null
          location_scope: string | null
          posted_by: string | null
          qualification_required: string | null
          salary_range: string | null
          sector: string | null
          skills_required: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          applicants_count?: number | null
          company: string
          created_at?: string
          custom_questions?: Json | null
          deadline?: string | null
          description: string
          employment_type?: string | null
          experience_level?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          lga?: string | null
          location?: string | null
          location_scope?: string | null
          posted_by?: string | null
          qualification_required?: string | null
          salary_range?: string | null
          sector?: string | null
          skills_required?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          applicants_count?: number | null
          company?: string
          created_at?: string
          custom_questions?: Json | null
          deadline?: string | null
          description?: string
          employment_type?: string | null
          experience_level?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          lga?: string | null
          location?: string | null
          location_scope?: string | null
          posted_by?: string | null
          qualification_required?: string | null
          salary_range?: string | null
          sector?: string | null
          skills_required?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          duration: string | null
          id: string
          order_index: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          duration?: string | null
          id?: string
          order_index?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          duration?: string | null
          id?: string
          order_index?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          mapping_id: string | null
          mentee_id: string
          mentor_id: string
          rating: number
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          mapping_id?: string | null
          mentee_id: string
          mentor_id: string
          rating: number
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          mapping_id?: string | null
          mentee_id?: string
          mentor_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_ratings_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "mentorship_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_ratings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          bio: string | null
          category: string
          created_at: string
          current_mentees: number | null
          id: string
          is_active: boolean | null
          max_mentees: number | null
          specialization: string | null
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          category: string
          created_at?: string
          current_mentees?: number | null
          id?: string
          is_active?: boolean | null
          max_mentees?: number | null
          specialization?: string | null
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          category?: string
          created_at?: string
          current_mentees?: number | null
          id?: string
          is_active?: boolean | null
          max_mentees?: number | null
          specialization?: string | null
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      mentorship_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          mapping_id: string
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          mapping_id: string
          status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          mapping_id?: string
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_goals_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "mentorship_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_listings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          expectations: string | null
          experience_level: string | null
          id: string
          is_active: boolean | null
          listing_type: string
          skills: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          expectations?: string | null
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          listing_type?: string
          skills?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          expectations?: string | null
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          listing_type?: string
          skills?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentorship_mappings: {
        Row: {
          auto_matched: boolean | null
          created_at: string
          id: string
          match_reason: string | null
          mentee_id: string
          mentor_id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          auto_matched?: boolean | null
          created_at?: string
          id?: string
          match_reason?: string | null
          mentee_id: string
          mentor_id: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          auto_matched?: boolean | null
          created_at?: string
          id?: string
          match_reason?: string | null
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_mappings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          listing_id: string | null
          message: string | null
          request_type: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          listing_id?: string | null
          message?: string | null
          request_type?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          request_type?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "mentorship_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          mapping_id: string
          mentee_id: string
          mentor_id: string
          notes: string | null
          scheduled_at: string | null
          session_type: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mapping_id: string
          mentee_id: string
          mentor_id: string
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mapping_id?: string
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "mentorship_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pipeline_history: {
        Row: {
          application_id: string
          changed_by: string
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
        }
        Insert: {
          application_id: string
          changed_by: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
        }
        Update: {
          application_id?: string
          changed_by?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          project_url: string | null
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          project_url?: string | null
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          project_url?: string | null
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          certifications: string[] | null
          created_at: string
          current_employer: string | null
          cv_file_url: string | null
          date_of_birth: string | null
          email: string | null
          employment_status: string | null
          full_name: string
          gender: string | null
          id: string
          job_title: string | null
          lga: string | null
          marital_status: string | null
          nationality: string | null
          nin: string | null
          passport_photo_url: string | null
          phone: string | null
          profile_completion: number | null
          residential_address: string | null
          sector: string | null
          skills: string[] | null
          state_of_origin: string | null
          updated_at: string
          user_id: string
          user_type: string | null
          village: string | null
          ward: string | null
          work_experience: string | null
        }
        Insert: {
          approval_status?: string | null
          certifications?: string[] | null
          created_at?: string
          current_employer?: string | null
          cv_file_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          employment_status?: string | null
          full_name: string
          gender?: string | null
          id?: string
          job_title?: string | null
          lga?: string | null
          marital_status?: string | null
          nationality?: string | null
          nin?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          profile_completion?: number | null
          residential_address?: string | null
          sector?: string | null
          skills?: string[] | null
          state_of_origin?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          village?: string | null
          ward?: string | null
          work_experience?: string | null
        }
        Update: {
          approval_status?: string | null
          certifications?: string[] | null
          created_at?: string
          current_employer?: string | null
          cv_file_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          employment_status?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          job_title?: string | null
          lga?: string | null
          marital_status?: string | null
          nationality?: string | null
          nin?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          profile_completion?: number | null
          residential_address?: string | null
          sector?: string | null
          skills?: string[] | null
          state_of_origin?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          village?: string | null
          ward?: string | null
          work_experience?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string
          id: string
          options: Json
          order_index: number
          question: string
          quiz_id: string
        }
        Insert: {
          correct_answer?: number
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question: string
          quiz_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question?: string
          quiz_id?: string
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
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          job_id: string | null
          pass_score: number | null
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          job_id?: string | null
          pass_score?: number | null
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          job_id?: string | null
          pass_score?: number | null
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          recruiter_id: string
          tags: string[] | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recruiter_id: string
          tags?: string[] | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recruiter_id?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorser_id: string
          id: string
          skill: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endorser_id: string
          id?: string
          skill: string
          user_id: string
        }
        Update: {
          created_at?: string
          endorser_id?: string
          id?: string
          skill?: string
          user_id?: string
        }
        Relationships: []
      }
      social_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      social_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          media_type: string | null
          media_urls: string[] | null
          shares_count: number | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          shares_count?: number | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      social_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_meetings: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          meeting_type: string
          notes: string | null
          participants: string[] | null
          related_id: string | null
          room_name: string
          scheduled_at: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          meeting_type?: string
          notes?: string | null
          participants?: string[] | null
          related_id?: string | null
          room_name: string
          scheduled_at?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          meeting_type?: string
          notes?: string | null
          participants?: string[] | null
          related_id?: string | null
          room_name?: string
          scheduled_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_questions_public: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          order_index: number | null
          question: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          question?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          question?: string | null
          quiz_id?: string | null
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
    }
    Functions: {
      calculate_profile_completion: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: number
      }
      grade_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: {
          passed: boolean
          score: number
          total_questions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_certificate: {
        Args: { _cert_number: string }
        Returns: {
          certificate_number: string
          course_category: string
          course_level: string
          course_title: string
          holder_name: string
          issued_at: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "lga_officer"
        | "recruiter"
        | "mentor"
        | "instructor"
        | "user"
        | "super_admin"
        | "citizen_db_admin"
        | "mentorship_admin"
        | "recruitment_admin"
        | "cbt_admin"
        | "learning_admin"
        | "ward_officer"
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
        "admin",
        "lga_officer",
        "recruiter",
        "mentor",
        "instructor",
        "user",
        "super_admin",
        "citizen_db_admin",
        "mentorship_admin",
        "recruitment_admin",
        "cbt_admin",
        "learning_admin",
        "ward_officer",
      ],
    },
  },
} as const

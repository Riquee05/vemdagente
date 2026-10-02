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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          application_id: string | null
          attempts: number
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          password_hash: string
          password_salt: string
          status: string
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          application_id?: string | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          password_hash: string
          password_salt: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          application_id?: string | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          password_hash?: string
          password_salt?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "volunteer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_otp_attempts: {
        Row: {
          attempts: number
          blocked_until: string | null
          created_at: string
          last_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          last_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          last_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_step_up: {
        Row: {
          created_at: string
          expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          created_at: string
          id: string
          mode: string
          session_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          suggested_point_ids: string[] | null
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          suggested_point_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          suggested_point_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      causes: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_points: {
        Row: {
          address: string | null
          city: string
          claimed_by: string | null
          confirmation_status: string
          confirmed_at: string | null
          created_at: string
          curation_status: string
          description: string | null
          donation_hours: string | null
          donation_method: string | null
          google_place_id: string | null
          hidden_reason: string | null
          id: string
          is_active: boolean
          lat: number
          lng: number
          location_type: string | null
          name: string
          opening_hours: string | null
          phone: string | null
          photo_url: string | null
          source: string
          state: string | null
          submitted_by: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city: string
          claimed_by?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          curation_status?: string
          description?: string | null
          donation_hours?: string | null
          donation_method?: string | null
          google_place_id?: string | null
          hidden_reason?: string | null
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          location_type?: string | null
          name: string
          opening_hours?: string | null
          phone?: string | null
          photo_url?: string | null
          source?: string
          state?: string | null
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          claimed_by?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          curation_status?: string
          description?: string | null
          donation_hours?: string | null
          donation_method?: string | null
          google_place_id?: string | null
          hidden_reason?: string | null
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          location_type?: string | null
          name?: string
          opening_hours?: string | null
          phone?: string | null
          photo_url?: string | null
          source?: string
          state?: string | null
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_points_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_points_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          category_id: string
          city: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          requester_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          city: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          requester_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          city?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          requester_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_accepted_items: {
        Row: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          point_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          point_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          point_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_accepted_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_accepted_items_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
        ]
      }
      point_causes: {
        Row: {
          cause_id: string
          created_at: string
          id: string
          point_id: string
          updated_at: string
        }
        Insert: {
          cause_id: string
          created_at?: string
          id?: string
          point_id: string
          updated_at?: string
        }
        Update: {
          cause_id?: string
          created_at?: string
          id?: string
          point_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_causes_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_causes_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
        ]
      }
      point_corrections: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          message: string
          point_id: string
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          message: string
          point_id: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          message?: string
          point_id?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_corrections_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
        ]
      }
      point_import_logs: {
        Row: {
          created_at: string
          id: string
          points_created: number
          points_found: number
          query_city: string
          run_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_created?: number
          points_found?: number
          query_city: string
          run_by?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_created?: number
          points_found?: number
          query_city?: string
          run_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_needs: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          note: string | null
          point_id: string
          updated_at: string
          urgency: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          note?: string | null
          point_id: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          note?: string | null
          point_id?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_needs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_needs_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_city: string | null
          default_lat: number | null
          default_lng: number | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_city?: string | null
          default_lat?: number | null
          default_lng?: number | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_city?: string | null
          default_lat?: number | null
          default_lng?: number | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      request_rate_limits: {
        Row: {
          expires_at: string
          identifier_hash: string
          request_count: number
          scope: string
          updated_at: string
        }
        Insert: {
          expires_at: string
          identifier_hash: string
          request_count?: number
          scope: string
          updated_at?: string
        }
        Update: {
          expires_at?: string
          identifier_hash?: string
          request_count?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          application_id: string | null
          areas: string[]
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          joined_at: string
          notes: string | null
          phone: string | null
          role_title: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          areas?: string[]
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          joined_at?: string
          notes?: string | null
          phone?: string | null
          role_title?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          areas?: string[]
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          joined_at?: string
          notes?: string | null
          phone?: string | null
          role_title?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "volunteer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voluntary_donations: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          donor_id: string | null
          id: string
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          donor_id?: string | null
          id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          donor_id?: string | null
          id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voluntary_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_applications: {
        Row: {
          admin_notes: string | null
          areas: string[]
          availability: string | null
          city: string | null
          created_at: string
          email: string
          experience: string | null
          full_name: string
          heard_from: string | null
          id: string
          motivation: string | null
          phone: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          areas?: string[]
          availability?: string | null
          city?: string | null
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          heard_from?: string | null
          id?: string
          motivation?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          areas?: string[]
          availability?: string | null
          city?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          heard_from?: string | null
          id?: string
          motivation?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_stage_events: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_stage_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "volunteer_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_stage_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_request_rate_limit: {
        Args: {
          p_identifier_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
      search_nearby_points: {
        Args: {
          p_category_id?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
        }
        Returns: {
          address: string
          city: string
          description: string
          distance_km: number
          donation_method: string
          id: string
          lat: number
          lng: number
          name: string
          opening_hours: string
          phone: string
          photo_url: string
          state: string
          website: string
          whatsapp: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "owner" | "volunteer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "owner", "volunteer"],
    },
  },
} as const

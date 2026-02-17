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
      blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string | null
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          blocked_date: string
          created_at?: string | null
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          blocked_date?: string
          created_at?: string | null
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deposit_amount: number | null
          google_calendar_event_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          service_id: string | null
          status: string | null
          total_price: number
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deposit_amount?: number | null
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string | null
          status?: string | null
          total_price: number
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deposit_amount?: number | null
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string | null
          status?: string | null
          total_price?: number
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_name: string
          id: string
          is_verified: boolean | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_name: string
          id?: string
          is_verified?: boolean | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_name?: string
          id?: string
          is_verified?: boolean | null
          rating?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration_min: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_min: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          admin_phone: string | null
          background_image_url: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          bit_business_name: string | null
          bit_payment_url: string | null
          bit_phone_number: string | null
          business_address: string | null
          business_logo_url: string | null
          business_name: string | null
          business_phone: string | null
          deposit_fixed_amount: number | null
          deposit_percentage: number | null
          google_calendar_id: string | null
          id: string
          is_deposit_active: boolean | null
          max_advance_days: number | null
          min_advance_hours: number | null
          payment_bank_enabled: boolean | null
          payment_bit_enabled: boolean | null
          payment_cash_enabled: boolean | null
          payment_credit_enabled: boolean | null
          payment_stripe_enabled: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          primary_color: string | null
          secondary_color: string | null
          send_confirmation_sms: boolean | null
          send_reminder_hours: number | null
          slot_duration_min: number | null
          updated_at: string | null
          whatsapp_api_token: string | null
          whatsapp_float_number: string | null
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
          instagram_url: string | null
          facebook_url: string | null
          show_instagram: boolean | null
          show_facebook: boolean | null
        }
        Insert: {
          admin_phone?: string | null
          background_image_url?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bit_business_name?: string | null
          bit_payment_url?: string | null
          bit_phone_number?: string | null
          business_address?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          deposit_fixed_amount?: number | null
          deposit_percentage?: number | null
          google_calendar_id?: string | null
          id?: string
          is_deposit_active?: boolean | null
          max_advance_days?: number | null
          min_advance_hours?: number | null
          payment_bank_enabled?: boolean | null
          payment_bit_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          send_confirmation_sms?: boolean | null
          send_reminder_hours?: number | null
          slot_duration_min?: number | null
          updated_at?: string | null
          whatsapp_api_token?: string | null
          whatsapp_float_number?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          show_instagram?: boolean | null
          show_facebook?: boolean | null
        }
        Update: {
          admin_phone?: string | null
          background_image_url?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bit_business_name?: string | null
          bit_payment_url?: string | null
          bit_phone_number?: string | null
          business_address?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          deposit_fixed_amount?: number | null
          deposit_percentage?: number | null
          google_calendar_id?: string | null
          id?: string
          is_deposit_active?: boolean | null
          max_advance_days?: number | null
          min_advance_hours?: number | null
          payment_bank_enabled?: boolean | null
          payment_bit_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          send_confirmation_sms?: boolean | null
          send_reminder_hours?: number | null
          slot_duration_min?: number | null
          updated_at?: string | null
          whatsapp_api_token?: string | null
          whatsapp_float_number?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          show_instagram?: boolean | null
          show_facebook?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiting_list: {
        Row: {
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: string
          requested_date: string
          service_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          requested_date: string
          service_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          requested_date?: string
          service_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_settings: {
        Args: { data: Record<string, unknown> }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

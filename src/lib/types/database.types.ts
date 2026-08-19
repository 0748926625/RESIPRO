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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          category: string | null
          icon: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          category?: string | null
          icon?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          category?: string | null
          icon?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          note: string | null
          property_id: string
          reason: Database["public"]["Enums"]["availability_block_reason"]
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          note?: string | null
          property_id: string
          reason?: Database["public"]["Enums"]["availability_block_reason"]
          starts_at: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          note?: string | null
          property_id?: string
          reason?: Database["public"]["Enums"]["availability_block_reason"]
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_blocks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          min_duration_minutes: number
          open_time: string
          property_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          min_duration_minutes?: number
          open_time: string
          property_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          min_duration_minutes?: number
          open_time?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_segments: {
        Row: {
          booking_id: string
          created_at: string
          ends_at: string
          id: string
          participant_profile_id: string
          price_share: number
          property_id: string
          segment_order: number
          starts_at: string
          status: Database["public"]["Enums"]["segment_status"]
        }
        Insert: {
          booking_id: string
          created_at?: string
          ends_at: string
          id?: string
          participant_profile_id: string
          price_share?: number
          property_id: string
          segment_order: number
          starts_at: string
          status?: Database["public"]["Enums"]["segment_status"]
        }
        Update: {
          booking_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          participant_profile_id?: string
          price_share?: number
          property_id?: string
          segment_order?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["segment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_segments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_segments_participant_profile_id_fkey"
            columns: ["participant_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_segments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_code: string
          created_at: string
          created_by: string
          currency: string
          ends_at: string
          expires_at: string | null
          id: string
          property_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          type: Database["public"]["Enums"]["booking_type"]
          updated_at: string
        }
        Insert: {
          booking_code: string
          created_at?: string
          created_by: string
          currency?: string
          ends_at: string
          expires_at?: string | null
          id?: string
          property_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          type?: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Update: {
          booking_code?: string
          created_at?: string
          created_by?: string
          currency?: string
          ends_at?: string
          expires_at?: string | null
          id?: string
          property_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          type?: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          performed_by: string
          property_id: string
          reason: string
          related_expense_id: string | null
          related_income_id: string | null
          reversal_of: string | null
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          performed_by: string
          property_id: string
          reason: string
          related_expense_id?: string | null
          related_income_id?: string | null
          reversal_of?: string | null
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          performed_by?: string
          property_id?: string
          reason?: string
          related_expense_id?: string | null
          related_income_id?: string | null
          reversal_of?: string | null
          type?: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_related_expense_id_fkey"
            columns: ["related_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_related_income_id_fkey"
            columns: ["related_income_id"]
            isOneToOne: false
            referencedRelation: "income_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          key: string
          label: string
        }
        Insert: {
          id?: string
          key: string
          label: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          expense_date: string
          id: string
          property_id: string
          recorded_by: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          property_id: string
          recorded_by: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          property_id?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          income_date: string
          property_id: string
          recorded_by: string
          source: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          income_date?: string
          property_id: string
          recorded_by: string
          source?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          income_date?: string
          property_id?: string
          recorded_by?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intermediation_requests: {
        Row: {
          assigned_property_id: string | null
          budget: number | null
          client_profile_id: string | null
          comments: string | null
          created_at: string
          full_name: string
          handled_by: string | null
          id: string
          linked_booking_id: string | null
          party_size: number | null
          phone: string
          preferences: string | null
          requested_city: string | null
          requested_date: string | null
          requested_end: string | null
          requested_neighborhood: string | null
          requested_start: string | null
          status: Database["public"]["Enums"]["intermediation_status"]
          updated_at: string
        }
        Insert: {
          assigned_property_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          comments?: string | null
          created_at?: string
          full_name: string
          handled_by?: string | null
          id?: string
          linked_booking_id?: string | null
          party_size?: number | null
          phone: string
          preferences?: string | null
          requested_city?: string | null
          requested_date?: string | null
          requested_end?: string | null
          requested_neighborhood?: string | null
          requested_start?: string | null
          status?: Database["public"]["Enums"]["intermediation_status"]
          updated_at?: string
        }
        Update: {
          assigned_property_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          comments?: string | null
          created_at?: string
          full_name?: string
          handled_by?: string | null
          id?: string
          linked_booking_id?: string | null
          party_size?: number | null
          phone?: string
          preferences?: string | null
          requested_city?: string | null
          requested_date?: string | null
          requested_end?: string | null
          requested_neighborhood?: string | null
          requested_start?: string | null
          status?: Database["public"]["Enums"]["intermediation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intermediation_requests_assigned_property_id_fkey"
            columns: ["assigned_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediation_requests_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediation_requests_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intermediation_requests_linked_booking_id_fkey"
            columns: ["linked_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          profile_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          business_name: string | null
          created_at: string
          id: string
          profile_id: string
          verified: boolean
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          id?: string
          profile_id: string
          verified?: boolean
        }
        Update: {
          business_name?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          payer_profile_id: string
          reference_code: string
          segment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payer_profile_id: string
          reference_code: string
          segment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payer_profile_id?: string
          reference_code?: string
          segment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_profile_id_fkey"
            columns: ["payer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "booking_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          base_price: number
          bedrooms: number
          capacity: number
          check_in_time: string | null
          check_out_time: string | null
          city: string
          cleaning_buffer_minutes: number
          created_at: string
          currency: string
          description: string | null
          house_rules: string | null
          id: string
          latitude: number | null
          longitude: number | null
          manager_phone_visibility: Database["public"]["Enums"]["manager_phone_visibility"]
          name: string
          neighborhood: string | null
          owner_id: string
          property_type: string
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          base_price?: number
          bedrooms?: number
          capacity?: number
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          cleaning_buffer_minutes?: number
          created_at?: string
          currency?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_phone_visibility?: Database["public"]["Enums"]["manager_phone_visibility"]
          name: string
          neighborhood?: string | null
          owner_id: string
          property_type?: string
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          base_price?: number
          bedrooms?: number
          capacity?: number
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          cleaning_buffer_minutes?: number
          created_at?: string
          currency?: string
          description?: string | null
          house_rules?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_phone_visibility?: Database["public"]["Enums"]["manager_phone_visibility"]
          name?: string
          neighborhood?: string | null
          owner_id?: string
          property_type?: string
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          position: number
          property_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          property_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_charges: {
        Row: {
          amount: number
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          label: string
          next_due_date: string
          property_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          frequency: string
          id?: string
          is_active?: boolean
          label: string
          next_due_date: string
          property_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          label?: string
          next_due_date?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_booking_requests: {
        Row: {
          booking_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          initiator_profile_id: string
          property_id: string
          requested_end: string
          requested_start: string
          status: Database["public"]["Enums"]["shared_request_status"]
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          initiator_profile_id: string
          property_id: string
          requested_end: string
          requested_start: string
          status?: Database["public"]["Enums"]["shared_request_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          initiator_profile_id?: string
          property_id?: string
          requested_end?: string
          requested_start?: string
          status?: Database["public"]["Enums"]["shared_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_booking_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_booking_requests_initiator_profile_id_fkey"
            columns: ["initiator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_booking_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_mark_booking_reserved_with_owner: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      cancel_shared_booking_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      confirm_payment: { Args: { p_payment_id: string }; Returns: undefined }
      create_classic_booking: {
        Args: { p_ends_at: string; p_property_id: string; p_starts_at: string }
        Returns: string
      }
      create_shared_booking_request: {
        Args: {
          p_ends_at: string
          p_expiry_hours?: number
          p_property_id: string
          p_starts_at: string
        }
        Returns: string
      }
      fits_availability_window: {
        Args: { p_ends_at: string; p_property_id: string; p_starts_at: string }
        Returns: boolean
      }
      generate_booking_code: { Args: never; Returns: string }
      has_overlapping_segment: {
        Args: {
          p_buffer_minutes?: number
          p_ends_at: string
          p_property_id: string
          p_starts_at: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      join_shared_booking_request: {
        Args: { p_ends_at: string; p_request_id: string; p_starts_at: string }
        Returns: string
      }
      owner_confirm_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      owns_property: { Args: { p_property_id: string }; Returns: boolean }
      reject_payment: {
        Args: { p_note?: string; p_payment_id: string }
        Returns: undefined
      }
      resubmit_payment: { Args: { p_payment_id: string }; Returns: undefined }
      set_property_status: {
        Args: {
          p_allowed_from: Database["public"]["Enums"]["property_status"][]
          p_new_status: Database["public"]["Enums"]["property_status"]
          p_property_id: string
        }
        Returns: undefined
      }
      submit_payment: { Args: { p_payment_id: string }; Returns: undefined }
      write_audit_log: {
        Args: {
          p_action: string
          p_actor: string
          p_entity_id: string
          p_entity_type: string
          p_new?: Json
          p_old?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      availability_block_reason: "maintenance" | "cleaning" | "manual" | "other"
      booking_status:
        | "draft"
        | "pending"
        | "awaiting_payment"
        | "payment_received"
        | "awaiting_owner_confirmation"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
      booking_type: "classic" | "shared"
      cash_transaction_type: "in" | "out"
      commission_type: "fixed" | "percentage"
      intermediation_status:
        | "new"
        | "contacted"
        | "residence_found"
        | "client_referred"
        | "reservation_created"
        | "completed"
        | "cancelled"
      manager_phone_visibility: "hidden" | "admin_only" | "revealed"
      payment_status:
        | "pending"
        | "payment_submitted"
        | "payment_confirmed"
        | "payment_rejected"
      property_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "suspended"
        | "archived"
      segment_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      shared_request_status:
        | "searching_partner"
        | "partner_found"
        | "expired"
        | "cancelled"
        | "converted"
      user_role: "super_admin" | "owner" | "client"
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
      availability_block_reason: ["maintenance", "cleaning", "manual", "other"],
      booking_status: [
        "draft",
        "pending",
        "awaiting_payment",
        "payment_received",
        "awaiting_owner_confirmation",
        "confirmed",
        "checked_in",
        "checked_out",
        "completed",
        "cancelled",
        "rejected",
        "expired",
      ],
      booking_type: ["classic", "shared"],
      cash_transaction_type: ["in", "out"],
      commission_type: ["fixed", "percentage"],
      intermediation_status: [
        "new",
        "contacted",
        "residence_found",
        "client_referred",
        "reservation_created",
        "completed",
        "cancelled",
      ],
      manager_phone_visibility: ["hidden", "admin_only", "revealed"],
      payment_status: [
        "pending",
        "payment_submitted",
        "payment_confirmed",
        "payment_rejected",
      ],
      property_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "suspended",
        "archived",
      ],
      segment_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      shared_request_status: [
        "searching_partner",
        "partner_found",
        "expired",
        "cancelled",
        "converted",
      ],
      user_role: ["super_admin", "owner", "client"],
    },
  },
} as const

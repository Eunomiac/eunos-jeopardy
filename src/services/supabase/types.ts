export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GameStatus = "lobby" | "in_progress" | "completed" | "cancelled";
export type RoundType = "jeopardy" | "double" | "final";

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          adjudicated_by: string | null
          clue_id: string
          created_at: string
          game_id: string
          id: string
          is_correct: boolean | null
          response: string
          user_id: string
        }
        Insert: {
          adjudicated_by?: string | null
          clue_id: string
          created_at?: string
          game_id: string
          id?: string
          is_correct?: boolean | null
          response: string
          user_id: string
        }
        Update: {
          adjudicated_by?: string | null
          clue_id?: string
          created_at?: string
          game_id?: string
          id?: string
          is_correct?: boolean | null
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_adjudicated_by_fkey"
            columns: ["adjudicated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          clue_set_id: string | null
          daily_double_cells: Json | null
          id: string
          round: Database["public"]["Enums"]["round_type"]
        }
        Insert: {
          clue_set_id?: string | null
          daily_double_cells?: Json | null
          id?: string
          round: Database["public"]["Enums"]["round_type"]
        }
        Update: {
          clue_set_id?: string | null
          daily_double_cells?: Json | null
          id?: string
          round?: Database["public"]["Enums"]["round_type"]
        }
        Relationships: []
      }
      buzzes: {
        Row: {
          clue_id: string
          created_at: string
          game_id: string
          id: string
          reaction_time: number | null
          user_id: string
        }
        Insert: {
          clue_id: string
          created_at?: string
          game_id: string
          id?: string
          reaction_time?: number | null
          user_id: string
        }
        Update: {
          clue_id?: string
          created_at?: string
          game_id?: string
          id?: string
          reaction_time?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buzzes_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          board_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          board_id: string
          id?: string
          name: string
          position: number
        }
        Update: {
          board_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      clue_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clue_sets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clue_states: {
        Row: {
          clue_id: string
          completed: boolean
          game_id: string
          revealed: boolean
        }
        Insert: {
          clue_id: string
          completed?: boolean
          game_id: string
          revealed?: boolean
        }
        Update: {
          clue_id?: string
          completed?: boolean
          game_id?: string
          revealed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clue_states_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clue_states_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      clues: {
        Row: {
          category_id: string
          id: string
          locked_out_player_ids: string[] | null
          position: number
          prompt: string
          response: string
          value: number
        }
        Insert: {
          category_id: string
          id?: string
          locked_out_player_ids?: string[] | null
          position: number
          prompt: string
          response: string
          value: number
        }
        Update: {
          category_id?: string
          id?: string
          locked_out_player_ids?: string[] | null
          position?: number
          prompt?: string
          response?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "clues_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_reports: {
        Row: {
          clue_set_data: Json
          clue_set_name: string
          completed_at: string | null
          created_at: string
          current_round: Database["public"]["Enums"]["round_type"]
          final_scores: Json | null
          game_duration_minutes: number | null
          host_id: string
          id: string
          original_game_id: string
          report_created_at: string
          status: Database["public"]["Enums"]["game_status"]
          total_players: number
        }
        Insert: {
          clue_set_data: Json
          clue_set_name: string
          completed_at?: string | null
          created_at: string
          current_round: Database["public"]["Enums"]["round_type"]
          final_scores?: Json | null
          game_duration_minutes?: number | null
          host_id: string
          id?: string
          original_game_id: string
          report_created_at?: string
          status: Database["public"]["Enums"]["game_status"]
          total_players?: number
        }
        Update: {
          clue_set_data?: Json
          clue_set_name?: string
          completed_at?: string | null
          created_at?: string
          current_round?: Database["public"]["Enums"]["round_type"]
          final_scores?: Json | null
          game_duration_minutes?: number | null
          host_id?: string
          id?: string
          original_game_id?: string
          report_created_at?: string
          status?: Database["public"]["Enums"]["game_status"]
          total_players?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_reports_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          clue_set_id: string | null
          created_at: string
          current_player_id: string | null
          current_round: Database["public"]["Enums"]["round_type"]
          focused_clue_id: string | null
          focused_player_id: string | null
          host_id: string
          id: string
          is_buzzer_locked: boolean
          status: Database["public"]["Enums"]["game_status"]
        }
        Insert: {
          clue_set_id?: string | null
          created_at?: string
          current_player_id?: string | null
          current_round?: Database["public"]["Enums"]["round_type"]
          focused_clue_id?: string | null
          focused_player_id?: string | null
          host_id: string
          id?: string
          is_buzzer_locked?: boolean
          status?: Database["public"]["Enums"]["game_status"]
        }
        Update: {
          clue_set_id?: string | null
          created_at?: string
          current_player_id?: string | null
          current_round?: Database["public"]["Enums"]["round_type"]
          focused_clue_id?: string | null
          focused_player_id?: string | null
          host_id?: string
          id?: string
          is_buzzer_locked?: boolean
          status?: Database["public"]["Enums"]["game_status"]
        }
        Relationships: [
          {
            foreignKeyName: "games_clue_set_id_fkey"
            columns: ["clue_set_id"]
            isOneToOne: false
            referencedRelation: "clue_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_focused_clue_id_fkey"
            columns: ["focused_clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_focused_player_id_fkey"
            columns: ["focused_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          game_id: string
          joined_at: string
          nickname: string | null
          score: number
          user_id: string
        }
        Insert: {
          game_id: string
          joined_at?: string
          nickname?: string | null
          score?: number
          user_id: string
        }
        Update: {
          game_id?: string
          joined_at?: string
          nickname?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          handwritten_font: string | null
          id: string
          role: string
          temp_handwritten_font: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          handwritten_font?: string | null
          id: string
          role?: string
          temp_handwritten_font?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          handwritten_font?: string | null
          id?: string
          role?: string
          temp_handwritten_font?: string | null
          username?: string | null
        }
        Relationships: []
      }
      wagers: {
        Row: {
          amount: number
          clue_id: string | null
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          clue_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          clue_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wagers_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wagers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wagers_user_id_fkey"
            columns: ["user_id"]
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
      create_game_report: {
        Args: { p_game_id: string }
        Returns: string
      }
      is_game_participant: {
        Args: { p_game_id: string }
        Returns: boolean
      }
    }
    Enums: {

      game_status: GameStatus
      round_type: RoundType
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
      game_status: ["lobby", "in_progress", "completed", "cancelled"],
      round_type: ["jeopardy", "double", "final"],
    },
  },
} as const

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
      products: {
        Row: {
          id: string
          product_sn: string
          product_name: string
          factory_price: number
          godown_price: number
          delivery_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_sn: string
          product_name: string
          factory_price: number
          godown_price: number
          delivery_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_sn?: string
          product_name?: string
          factory_price?: number
          godown_price?: number
          delivery_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      factory_stock: {
        Row: {
          id: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          type: 'MATERIAL'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          type: 'MATERIAL'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_sn?: string
          product_name?: string
          quantity?: number
          type?: 'MATERIAL'
          created_at?: string
          updated_at?: string
        }
      }
      godown_stock: {
        Row: {
          id: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_sn?: string
          product_name?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      daily_production: {
        Row: {
          id: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_sn: string
          product_name: string
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_sn?: string
          product_name?: string
          quantity?: number
          created_at?: string
          updated_at?: string
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
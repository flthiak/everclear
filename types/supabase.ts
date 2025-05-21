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
      customers: {
        Row: {
          id: string
          type: 'customer' | 'distributor' | 'counter'
          name: string
          phone: string | null
          address: string | null
          credit_limit: number
          current_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'customer' | 'distributor' | 'counter'
          name: string
          phone?: string | null
          address?: string | null
          credit_limit?: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'customer' | 'distributor' | 'counter'
          name?: string
          phone?: string | null
          address?: string | null
          credit_limit?: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          type: string
          factory_price: number
          customer_price: number
          delivery_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          factory_price: number
          customer_price: number
          delivery_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          factory_price?: number
          customer_price?: number
          delivery_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string
          type: string
          payment_method: string
          total_amount: number
          status: string
          delivery: boolean
          product_id: string
          quantity: number
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          type: string
          payment_method: string
          total_amount: number
          status?: string
          delivery?: boolean
          product_id: string
          quantity: number
          price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          type?: string
          payment_method?: string
          total_amount?: number
          status?: string
          delivery?: boolean
          product_id?: string
          quantity?: number
          price?: number
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          customer_id: string
          amount: number
          payment_method: 'cash' | 'credit'
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          payment_method: 'cash' | 'credit'
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          payment_method?: 'cash' | 'credit'
          payment_date?: string
          notes?: string | null
          created_at?: string
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
      customer_type: 'customer' | 'distributor' | 'counter'
      payment_method: 'cash' | 'credit'
      sale_status: 'pending' | 'completed' | 'cancelled'
    }
  }
}
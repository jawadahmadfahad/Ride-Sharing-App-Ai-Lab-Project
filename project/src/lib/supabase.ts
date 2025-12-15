import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  rating: number;
  total_rides: number;
  created_at: string;
  updated_at: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  passenger_id?: string;
  status: 'available' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  current_lat?: number;
  current_lng?: number;
  distance_km: number;
  estimated_duration_min: number;
  price: number;
  vehicle_type: string;
  seats_available: number;
  created_at: string;
  updated_at: string;
  driver?: Profile;
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  max_price: number;
  status: 'pending' | 'matched' | 'cancelled';
  created_at: string;
}

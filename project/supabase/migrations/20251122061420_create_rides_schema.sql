/*
  # Create Ride Sharing Application Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `avatar_url` (text, nullable)
      - `rating` (numeric, default 5.0)
      - `total_rides` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `rides`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles)
      - `passenger_id` (uuid, references profiles, nullable)
      - `status` (text: 'available', 'accepted', 'in_progress', 'completed', 'cancelled')
      - `pickup_lat` (numeric)
      - `pickup_lng` (numeric)
      - `pickup_address` (text)
      - `dropoff_lat` (numeric)
      - `dropoff_lng` (numeric)
      - `dropoff_address` (text)
      - `current_lat` (numeric, nullable)
      - `current_lng` (numeric, nullable)
      - `distance_km` (numeric)
      - `estimated_duration_min` (integer)
      - `price` (numeric)
      - `vehicle_type` (text)
      - `seats_available` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ride_requests`
      - `id` (uuid, primary key)
      - `passenger_id` (uuid, references profiles)
      - `pickup_lat` (numeric)
      - `pickup_lng` (numeric)
      - `pickup_address` (text)
      - `dropoff_lat` (numeric)
      - `dropoff_lng` (numeric)
      - `dropoff_address` (text)
      - `max_price` (numeric)
      - `status` (text: 'pending', 'matched', 'cancelled')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own profile and other users' public profile data
      - Update their own profile
      - Create and view rides
      - Create and view ride requests
      - Drivers can update their own rides
      - Passengers can view available rides
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  avatar_url text,
  rating numeric DEFAULT 5.0,
  total_rides integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passenger_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available',
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  pickup_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  current_lat numeric,
  current_lng numeric,
  distance_km numeric NOT NULL,
  estimated_duration_min integer NOT NULL,
  price numeric NOT NULL,
  vehicle_type text NOT NULL,
  seats_available integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('available', 'accepted', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available rides"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'available' OR driver_id = auth.uid() OR passenger_id = auth.uid());

CREATE POLICY "Drivers can create rides"
  ON rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Passengers can accept rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (status = 'available')
  WITH CHECK (auth.uid() = passenger_id);

-- Create ride_requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  pickup_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  max_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_request_status CHECK (status IN ('pending', 'matched', 'cancelled'))
);

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ride requests"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = passenger_id);

CREATE POLICY "Users can create ride requests"
  ON ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Users can update own ride requests"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = passenger_id)
  WITH CHECK (auth.uid() = passenger_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS rides_status_idx ON rides(status);
CREATE INDEX IF NOT EXISTS rides_driver_id_idx ON rides(driver_id);
CREATE INDEX IF NOT EXISTS rides_passenger_id_idx ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS ride_requests_passenger_id_idx ON ride_requests(passenger_id);
CREATE INDEX IF NOT EXISTS ride_requests_status_idx ON ride_requests(status);
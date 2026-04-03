-- Unified Database Schema for Applicants Dashboard & Staff Portal

-- 1. Applicants Table
CREATE TABLE applicants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mobile text NOT NULL,
  area text NOT NULL,
  experience text NOT NULL,
  status text DEFAULT 'pending',
  staff_id text,
  email text,
  role text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Staff Table
CREATE TABLE staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mobile text NOT NULL,
  staff_id text UNIQUE NOT NULL,
  password text,
  is_password_set boolean DEFAULT false,
  role text DEFAULT 'staff',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Staff Attendance Table
CREATE TABLE staff_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id text NOT NULL REFERENCES staff(staff_id),
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  date date DEFAULT CURRENT_DATE,
  status text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(staff_id, date)
);

-- Permissions & Security
-- Note: Disable RLS for rapid testing if needed, or configure policies
ALTER TABLE applicants DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;

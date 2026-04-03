-- Copy and paste this into your Supabase SQL Editor to create the table

CREATE TABLE applicants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mobile text NOT NULL,
  area text NOT NULL,
  experience text NOT NULL,
  status text DEFAULT 'pending',
  staff_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DISABLE RLS for testing (Required if data is not showing)
ALTER TABLE applicants DISABLE ROW LEVEL SECURITY;

-- Insert some dummy data for testing
INSERT INTO applicants (name, mobile, area, experience, status) VALUES 
('John Doe', '1234567890', 'New York', '2 years', 'pending'),
('Jane Smith', '0987654321', 'London', '5 years', 'pending');

-- NEW: Staff Table
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

-- Grant permissions for staff table
GRANT ALL ON TABLE staff TO anon, authenticated, postgres, service_role;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

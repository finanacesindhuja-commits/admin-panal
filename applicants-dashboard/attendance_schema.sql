-- Staff Attendance Table
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

-- Grant permissions
GRANT ALL ON TABLE staff_attendance TO anon, authenticated, postgres, service_role;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;

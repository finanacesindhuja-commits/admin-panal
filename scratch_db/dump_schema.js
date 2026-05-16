const { Client } = require('pg');
require('dotenv').config({ path: '../applicants-dashboard/backend/.env' });

const connectionString = process.env.SUPABASE_URL 
  ? process.env.SUPABASE_URL.replace('https://', 'postgres://postgres:').replace('.supabase.co', '') // wait, this is just the url, not the db connection string.
  : '';

// Actually, the SUPABASE_URL is not the postgres connection string.
// I will just use the Supabase REST API via Postgrest endpoints to fetch data.

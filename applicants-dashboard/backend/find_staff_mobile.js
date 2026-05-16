
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/full system sindhuja fin/admin panal/applicants-dashboard/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findStaffByMobile() {
  console.log('--- FINDING STAFF BY MOBILE ---');
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('mobile', '8072534827');
    
    if (error) throw error;
    console.log('Staff matching mobile 8072534827:', staff);

  } catch (err) {
    console.error(err.message);
  }
}
findStaffByMobile();

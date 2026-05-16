
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/full system sindhuja fin/admin panal/applicants-dashboard/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deepScan() {
  console.log('--- DEEP STATUS SCAN ---');
  try {
    const { data: loanStats } = await supabase.from('loans').select('status');
    const counts = {};
    loanStats.forEach(l => counts[l.status] = (counts[l.status] || 0) + 1);
    console.log('Loan Statuses:', counts);

    const { data: appStats } = await supabase.from('applicants').select('status');
    const appCounts = {};
    appStats.forEach(a => appCounts[a.status] = (appCounts[a.status] || 0) + 1);
    console.log('Applicant Statuses:', appCounts);

    const { data: staff } = await supabase.from('staff').select('name, staff_id');
    const { data: attendance } = await supabase.from('staff_attendance')
      .select('staff_id')
      .eq('date', new Date().toISOString().split('T')[0]);
    
    const checkedInIds = attendance.map(a => a.staff_id);
    const missing = staff.filter(s => !checkedInIds.includes(s.staff_id) && s.name !== 'Admin');
    console.log('Absent Staff:', missing.map(m => `${m.name} (${m.staff_id})`));

  } catch (err) {
    console.error(err.message);
  }
}
deepScan();

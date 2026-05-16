
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/full system sindhuja fin/admin panal/applicants-dashboard/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getStats() {
  const today = new Date().toISOString().split('T')[0];
  console.log('--- SYSTEM PENDING REPORT (Live Scan) ---');
  
  try {
    const [
      { count: applicants },
      { count: loansPending },
      { count: loansApproved },
      { count: loansSanctioned },
      { count: pdPending },
      { count: attendanceToday },
      { count: totalStaff },
      { count: collectionPending }
    ] = await Promise.all([
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'SANCTIONED').eq('disbursement_app_status', 'READY'),
      supabase.from('pd_verifications').select('*', { count: 'exact', head: true }).eq('status', 'Pending PD Verification'),
      supabase.from('staff_attendance').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('staff').select('*', { count: 'exact', head: true }).neq('role', 'Admin'),
      supabase.from('collection_schedules').select('*', { count: 'exact', head: true }).lte('scheduled_date', today).neq('status', 'Paid')
    ]);

    console.log(`1. [HR Dashboard] Pending Candidates: ${applicants || 0}`);
    console.log(`2. [Loan Verifier] Loans Waiting for PD: ${loansPending || 0}`);
    console.log(`3. [Manager Control] Loans Waiting for Sanction: ${loansApproved || 0}`);
    console.log(`4. [Disbursement] Loans Ready for Pay-out: ${loansSanctioned || 0}`);
    console.log(`5. [PD Module] Pending PD Verifications: ${pdPending || 0}`);
    console.log(`6. [HR Attendance] Staff Absent Today: ${Math.max(0, (totalStaff || 0) - (attendanceToday || 0))}`);
    console.log(`7. [Collection] Pending Collections Dues: ${collectionPending || 0}`);

  } catch (err) {
    console.error('Error fetching live stats:', err.message);
  }
}

getStats();

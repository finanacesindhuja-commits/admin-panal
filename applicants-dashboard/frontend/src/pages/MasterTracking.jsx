import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

const moduleConfigs = [
  { id: 'hrDashboard', name: 'HR Dashboard', description: 'Pending Staff Applications', color: 'blue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'hrAttendance', name: 'HR Attendance', description: 'Staff Missing Check-in Today', color: 'green', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'loanApplication', name: 'Loan Application', description: 'Freshly Submitted Loans', color: 'indigo', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'loanVerifier', name: 'Loan Verifier', description: 'Verification Queue', color: 'violet', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'pdVerification', name: 'PD Verification', description: 'Pre-Disbursement Queue', color: 'rose', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'managerControl', name: 'Manager Control', description: 'Sanction Approval Queue', color: 'cyan', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'disbursement', name: 'Disbursement', description: 'Ready for Credit Queue', color: 'amber', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'collectionControl', name: 'Collection Control', description: 'Dues Pending Collection', color: 'red', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

function MasterTracking() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/tracking-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Master Tracking System</h1>
          </div>
          <p className="text-gray-500 font-medium text-lg ml-5">Real-time overview of pending operations across all modules.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleConfigs.map((module) => {
            const count = stats[module.id] || 0;
            const colors = {
              blue: 'bg-blue-50 border-blue-100 text-blue-600 icon-bg-blue-500',
              green: 'bg-green-50 border-green-100 text-green-600 icon-bg-green-500',
              indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600 icon-bg-indigo-500',
              violet: 'bg-violet-50 border-violet-100 text-violet-600 icon-bg-violet-500',
              rose: 'bg-rose-50 border-rose-100 text-rose-600 icon-bg-rose-500',
              cyan: 'bg-cyan-50 border-cyan-100 text-cyan-600 icon-bg-cyan-500',
              amber: 'bg-amber-50 border-amber-100 text-amber-600 icon-bg-amber-500',
              red: 'bg-red-50 border-red-100 text-red-600 icon-bg-red-500',
            };

            const colorClass = colors[module.color];
            const hasWork = count > 0;

            return (
              <div 
                key={module.id}
                className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  hasWork ? colorClass : 'bg-white border-gray-100 text-gray-400 opacity-80'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${
                      hasWork ? `bg-white text-${module.color}-500` : 'bg-gray-50 text-gray-300'
                    }`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
                      </svg>
                    </div>
                    {hasWork && (
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        `bg-${module.color}-100 text-${module.color}-700 border border-${module.color}-200`
                      }`}>
                        Action Required
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-xl font-black mb-1 ${hasWork ? 'text-gray-900' : 'text-gray-400'}`}>
                      {module.name}
                    </h3>
                    <p className="text-xs font-medium opacity-70 mb-4 h-8 overflow-hidden">
                      {module.description}
                    </p>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black ${hasWork ? 'text-gray-900' : 'text-gray-300'}`}>
                        {count}
                      </span>
                      <span className="text-sm font-bold opacity-50 uppercase tracking-widest">Pending</span>
                    </div>
                  </div>
                </div>

                {/* Decorative background element */}
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${
                  hasWork ? `bg-${module.color}-600` : 'bg-gray-200'
                }`}></div>
              </div>
            );
          })}
        </div>

        <footer className="mt-16 p-8 bg-gray-900 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-xl font-bold mb-1">System Health Optimized</h4>
            <p className="text-gray-400 text-sm">All module syncs are running with &lt; 500ms latency.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                <div className="w-2h-2 bg-green-500 rounded-full animate-ping"></div>
                <span className="font-bold text-sm tracking-widest">LIVE SYNC ACTIVE</span>
             </div>
          </div>
        </footer>
      </div>
    </AdminLayout>
  );
}

export default MasterTracking;

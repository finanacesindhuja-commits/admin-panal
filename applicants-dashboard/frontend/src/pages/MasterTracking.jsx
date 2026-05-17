import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

const moduleConfigs = [
  { id: 'hrDashboard', name: 'HR Dashboard', description: 'Pending Staff Applications', color: 'blue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', path: '/applicants' },
  { id: 'hrAttendance', name: 'HR Attendance', description: 'Staff Missing Check-in Today', color: 'green', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', path: '/admin/attendance' },
  { id: 'loanApplication', name: 'Loan Application', description: 'Freshly Submitted Loans', color: 'indigo', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', path: '/admin/loans', state: { filter: 'PENDING' } },
  { id: 'loanVerifier', name: 'Loan Verifier', description: 'Verification Queue', color: 'violet', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', path: '/admin/loans', state: { filter: 'PENDING' } },
  { id: 'pdVerification', name: 'PD Verification', description: 'Pending PD Activities', color: 'rose', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', path: '/admin/pd-verifications' },
  { id: 'managerControl', name: 'Amount Approve', description: 'Sanction Approval Queue', color: 'cyan', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', path: '/admin/loans', state: { filter: 'APPROVED' } },
  { id: 'managerSchedule', name: 'Schedule Date', description: 'Assign Collection Days', color: 'emerald', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', path: '/admin/loans', state: { filter: 'SANCTIONED' } },
  { id: 'disbursement', name: 'Disbursement', description: 'Ready for Credit Queue', color: 'amber', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', path: '/admin/loans', state: { filter: 'DISBURSED' } },
  { id: 'collectionControl', name: 'Collection Control', description: 'Dues Pending Collection', color: 'red', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', path: '/admin/collections' },
];

function MasterTracking() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('turnover'); // 'turnover' or 'collection'
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

  const lastMonthTurnover = stats.lastMonthTurnover || 0;
  const liveMonthTurnover = stats.liveMonthTurnover || 0;
  const turnoverGrowth = lastMonthTurnover > 0 ? ((liveMonthTurnover - lastMonthTurnover) / lastMonthTurnover) * 100 : 0;

  const turnoverTrend = stats.monthlyTrend || [];
  const maxTurnover = Math.max(...turnoverTrend.map(d => d.amount), 10000);
  const turnoverPoints = turnoverTrend.map((d, idx) => {
    const x = (idx / 5) * 500;
    const y = 120 - ((d.amount / maxTurnover) * 90) - 15;
    return { x, y };
  });
  const turnoverPathD = turnoverPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const turnoverAreaD = turnoverTrend.length > 0 ? `${turnoverPathD} L 500 120 L 0 120 Z` : '';

  const lastMonthCollection = stats.lastMonthCollection || 0;
  const liveMonthCollection = stats.liveMonthCollection || 0;
  const collectionGrowth = lastMonthCollection > 0 ? ((liveMonthCollection - lastMonthCollection) / lastMonthCollection) * 100 : 0;

  const collectionTrend = stats.collectionTrend || [];
  const maxCollection = Math.max(...collectionTrend.map(d => d.amount), 1000);
  const collectionPoints = collectionTrend.map((d, idx) => {
    const x = (idx / 5) * 500;
    const y = 120 - ((d.amount / maxCollection) * 90) - 15;
    return { x, y };
  });
  const collectionPathD = collectionPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const collectionAreaD = collectionTrend.length > 0 ? `${collectionPathD} L 500 120 L 0 120 Z` : '';

  const isTurnover = activeTab === 'turnover';
  const liveMonth = isTurnover ? liveMonthTurnover : liveMonthCollection;
  const lastMonth = isTurnover ? lastMonthTurnover : lastMonthCollection;
  const growth = isTurnover ? turnoverGrowth : collectionGrowth;
  
  const trendData = isTurnover ? turnoverTrend : collectionTrend;
  const points = isTurnover ? turnoverPoints : collectionPoints;
  const pathD = isTurnover ? turnoverPathD : collectionPathD;
  const areaD = isTurnover ? turnoverAreaD : collectionAreaD;
  
  const accentColor = isTurnover ? '#4f46e5' : '#10b981'; // Indigo for Turnover, Emerald for Collection
  const gradientColor = isTurnover ? 'chartGradientIndigo' : 'chartGradientEmerald';

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
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-gray-500 font-medium text-lg ml-5">Real-time overview of financial growth and pending branch operations.</p>
        </header>

        {/* Tabbed Turnover & Collection Dashboard */}
        <section className="mb-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
          {/* Header & Tab Toggle Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-full">Financial Center</span>
              <h2 className="text-2xl font-black text-gray-900 mt-2 mb-1">Financial Performance & Analytics</h2>
              <p className="text-xs text-gray-400 font-semibold">Toggled overview of credit payouts and daily branch collection rates.</p>
            </div>
            
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200/50 self-start md:self-center">
              <button 
                onClick={() => setActiveTab('turnover')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  isTurnover 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                💳 Turnover Analytics
              </button>
              <button 
                onClick={() => setActiveTab('collection')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  !isTurnover 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                💰 Collection Analytics
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Stats Cards Section */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between gap-6">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  isTurnover 
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-100/50' 
                    : 'text-emerald-600 bg-emerald-50 border-emerald-100/50'
                }`}>
                  {isTurnover ? 'Disbursements Feed' : 'Collections Feed'}
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-3 mb-1">
                  {isTurnover ? 'Turnover Velocity' : 'Collection Efficiency'}
                </h3>
                <p className="text-xs text-gray-400 font-semibold">
                  {isTurnover 
                    ? 'Total capital disbursed to members across centers.' 
                    : 'Total payments collected from active loan EMI schedules.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isTurnover ? stats.branchTurnover : stats.branchCollection)?.length > 0 ? (
                  (isTurnover ? stats.branchTurnover : stats.branchCollection).map((bRow, bIdx) => (
                    <div key={bIdx} className={`p-5 rounded-2xl border relative overflow-hidden group transition-all duration-300 ${
                      isTurnover 
                        ? 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 border-indigo-100/50' 
                        : 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/20 border-emerald-100/50'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-wider mb-2 ${
                        isTurnover ? 'text-indigo-500' : 'text-emerald-600'
                      }`}>
                        {bRow.branch} Branch
                      </div>
                      <div className={`text-2xl font-black ${isTurnover ? 'text-indigo-950' : 'text-emerald-950'}`}>
                        ₹{bRow.live.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          bRow.growth >= 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bRow.growth >= 0 ? `+${bRow.growth.toFixed(1)}%` : `${bRow.growth.toFixed(1)}%`}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                          vs ₹{bRow.last.toLocaleString()} last month
                        </span>
                      </div>
                      <div className={`absolute right-4 bottom-4 w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isTurnover ? 'bg-indigo-600/10 text-indigo-600' : 'bg-emerald-600/10 text-emerald-600'
                      }`}>
                        {isTurnover ? '📈' : '💵'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-bold italic">
                    No active branch data recorded.
                  </div>
                )}
              </div>

              {/* Growth comparison banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                growth >= 0 
                  ? 'bg-green-50 border-green-100 text-green-700' 
                  : 'bg-red-50 border-red-100 text-red-700'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{growth >= 0 ? '🚀' : '📉'}</span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">
                      {isTurnover ? 'Capital Payout Growth' : 'Collection Growth Performance'}
                    </div>
                    <div className="text-[11px] font-medium opacity-85">
                      {growth >= 0 
                        ? `Up by ${growth.toFixed(1)}% compared to last month!` 
                        : `Down by ${Math.abs(growth).toFixed(1)}% compared to last month.`}
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                  growth >= 0 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`}
                </div>
              </div>
            </div>

            {/* Trading Sparkline Chart Section */}
            <div className="w-full lg:w-1/2 bg-gray-50/50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs font-black text-gray-700 uppercase tracking-widest">6-Month Trend Grid</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                    {isTurnover ? 'Disbursement Velocity (₹)' : 'Collection Flow (₹)'}
                  </div>
                </div>
                <span className={`text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse ${
                  isTurnover ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}>
                  Live Feed
                </span>
              </div>

              <div className="relative">
                {trendData.length > 0 ? (
                  <>
                    <svg viewBox="0 0 500 120" className="w-full h-32 overflow-visible">
                      <defs>
                        <linearGradient id="chartGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="chartGradientEmerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="15" x2="500" y2="15" stroke="#e5e7eb" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="#e5e7eb" strokeDasharray="3 3" />
                      <line x1="0" y1="105" x2="500" y2="105" stroke="#e5e7eb" strokeDasharray="3 3" />
                      
                      {/* Area Fill */}
                      <path d={areaD} fill={`url(#${gradientColor})`} />
                      {/* Line Stroke */}
                      <path d={pathD} fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Interactive Dots */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/dot">
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="5" 
                            fill="#ffffff" 
                            stroke={accentColor} 
                            strokeWidth="3.5" 
                            className="transition-all duration-200 hover:scale-125 cursor-pointer"
                          />
                          <title>{trendData[idx].monthName}: ₹{trendData[idx].amount.toLocaleString()}</title>
                        </g>
                      ))}
                    </svg>

                    {/* Month labels at bottom */}
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-3 px-1">
                      {trendData.map((d, idx) => (
                        <div key={idx} className="text-center w-14">
                          <div className="text-gray-500 font-black">{d.monthName}</div>
                          <div className={`text-[10px] font-black mt-0.5 ${
                            isTurnover ? 'text-indigo-600' : 'text-emerald-600'
                          }`}>
                            ₹{Math.round(d.amount / 1000)}K
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-gray-400 font-bold italic">No trend data available.</div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Branch Contribution breakdown */}
        <section className="mb-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                isTurnover 
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-100/50' 
                  : 'text-emerald-600 bg-emerald-50 border-emerald-100/50'
              }`}>
                {isTurnover ? 'Turnover Breakdown' : 'Collections Breakdown'}
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">Branch Contribution Breakdown</h2>
              <p className="text-xs text-gray-400 font-semibold mt-1">
                {isTurnover 
                  ? 'Contribution share and monthly growth of loan disbursements across active branches.' 
                  : 'Contribution share and monthly growth of EMI collections across active branches.'}
              </p>
            </div>
          </div>

          <div className="overflow-hidden border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Branch Office</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Live Month</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Last Month</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Monthly Growth</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contribution Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(isTurnover ? stats.branchTurnover : stats.branchCollection)?.length > 0 ? (
                  (isTurnover ? stats.branchTurnover : stats.branchCollection).map((row, idx) => {
                    const totalVolume = (isTurnover ? stats.branchTurnover : stats.branchCollection).reduce((sum, r) => sum + r.live, 0);
                    const ratio = totalVolume > 0 ? (row.live / totalVolume) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-indigo-950 uppercase tracking-wider text-sm">{row.branch}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Active Center Network</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-gray-900">
                          ₹{row.live.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-500">
                          ₹{row.last.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            row.growth >= 0 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {row.growth >= 0 ? `+${row.growth.toFixed(1)}%` : `${row.growth.toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isTurnover ? 'bg-indigo-600' : 'bg-emerald-600'
                                }`} 
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-indigo-950 w-10 text-right">{ratio.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-xs text-gray-400 font-bold italic">
                      No branch activity found for the selected view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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
              emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600 icon-bg-emerald-500',
              amber: 'bg-amber-50 border-amber-100 text-amber-600 icon-bg-amber-500',
              red: 'bg-red-50 border-red-100 text-red-600 icon-bg-red-500',
            };

            const colorClass = colors[module.color];
            const hasWork = count > 0;

            return (
              <div
                key={module.id}
                onClick={() => navigate(module.path, { state: module.state })}
                className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${hasWork ? colorClass : 'bg-white border-gray-100 text-gray-400 opacity-80'
                  }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${hasWork ? `bg-white text-${module.color}-500` : 'bg-gray-50 text-gray-300'
                      }`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
                      </svg>
                    </div>
                    {hasWork && (
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${`bg-${module.color}-100 text-${module.color}-700 border border-${module.color}-200`
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
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${hasWork ? `bg-${module.color}-600` : 'bg-gray-200'
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

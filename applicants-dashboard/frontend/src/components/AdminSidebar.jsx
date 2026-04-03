import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingApplicants, setPendingApplicants] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);

  useEffect(() => {
    // Fetch pending applicants count
    const fetchPendingApps = async () => {
      try {
        const response = await axios.get(`${API_URL}/applicants`);
        const pendingCount = response.data.filter(app => app.status === 'pending').length;
        setPendingApplicants(pendingCount);
      } catch (error) {
        console.error('Error fetching applicants:', error);
      }
    };

    // Fetch pending verifications (loans) count
    const fetchPendingVerifications = async () => {
      try {
        const response = await axios.get(`${API_URL}/pending-verifications-count`);
        setPendingVerifications(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching pending verifications:', error);
      }
    };

    const fetchAll = () => {
      fetchPendingApps();
      fetchPendingVerifications();
    };

    fetchAll();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      name: 'Applicants',
      path: '/applicants',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: pendingApplicants > 0 ? pendingApplicants : null
    },
    {
      name: 'Verification History',
      path: '/admin/verification-history',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      badge: pendingVerifications > 0 ? pendingVerifications : null
    },
    {
      name: 'Live Tracker',
      path: '/admin/locations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <span className="font-black text-xs">AD</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-none">Admin</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">HR Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {item.name}
            </div>
            {item.badge !== undefined && item.badge !== null && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-600 border border-orange-200 animate-pulse">
                {item.badge} Pending
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

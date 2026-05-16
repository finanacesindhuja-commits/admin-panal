import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

export default function LoansTracker() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCenters, setExpandedCenters] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'ALL');

  useEffect(() => {
    if (location.state?.filter) {
      setActiveFilter(location.state.filter);
    }
  }, [location.state]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchLoans();
  }, [navigate]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API_URL}/loans/all`);
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'APPROVED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'SANCTIONED': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'DISBURSED': return 'bg-green-50 text-green-600 border-green-100';
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };



  const filteredLoans = activeFilter === 'ALL'
    ? loans
    : loans.filter(loan => loan.status === activeFilter);

  const groupedLoans = filteredLoans.reduce((acc, loan) => {
    const center = loan.center_name || 'Unknown Center';
    if (!acc[center]) acc[center] = [];
    acc[center].push(loan);
    return acc;
  }, {});

  const toggleCenter = (centerName) => {
    setExpandedCenters(prev => ({
      ...prev,
      [centerName]: !prev[centerName]
    }));
  };

  return (
    <AdminLayout>
      <div className="p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Loan Lifecycle Tracker</h1>
          <p className="text-gray-500 mt-2 font-medium">
            {activeFilter === 'ALL' 
              ? 'Monitor every loan from application to disbursement.' 
              : `Currently viewing ${activeFilter} loans.`}
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Center</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Amount</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching Data...</span>
                    </div>
                  </td>
                </tr>
              ) : Object.entries(groupedLoans).map(([centerName, items]) => {
                const isExpanded = expandedCenters[centerName];
                return (
                <React.Fragment key={centerName}>
                  <tr 
                    className="bg-indigo-50/50 border-y border-indigo-100 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                    onClick={() => toggleCenter(centerName)}
                  >
                    <td colSpan="5" className="px-8 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                            {centerName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-indigo-950 text-sm uppercase tracking-wider">{centerName}</div>
                            <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">{items.length} Loans Total</div>
                          </div>
                        </div>
                        <div className={`text-indigo-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && items.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-900">{loan.person_name || loan.member_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {String(loan.id).slice(0, 8)}</div>
                      </td>
                      <td className="px-8 py-5 font-medium text-gray-600">{loan.center_name}</td>
                      <td className="px-8 py-5 text-center font-black text-gray-900">₹{loan.amount_sanctioned || '0'}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(loan.status)}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-[10px] font-bold text-gray-400 mb-1">
                          {loan.verified_at ? `Verified ${new Date(loan.verified_at).toLocaleDateString()}` : `Submitted ${new Date(loan.created_at).toLocaleDateString()}`}
                        </div>
                        <div className="flex gap-2">
                          {loan.display_staff_id && (
                            <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 inline-block min-w-24">
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Submitted By</div>
                              <div className="text-[10px] font-black text-gray-700">{loan.display_staff_name || 'Unknown Staff'}</div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {loan.display_staff_id}</div>
                            </div>
                          )}
                          {loan.verifier_id && (
                            <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100 inline-block min-w-24">
                              <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Verified By</div>
                              <div className="text-[10px] font-black text-indigo-700">{loan.verifier_name || 'Unknown Verifier'}</div>
                              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">ID: {loan.verifier_id}</div>
                            </div>
                          )}
                          {loan.disbursed_by && (
                            <div className="bg-green-50 rounded-lg p-2 border border-green-100 inline-block min-w-24">
                              <div className="text-[8px] font-bold text-green-500 uppercase tracking-widest mb-0.5">Disbursed By</div>
                              <div className="text-[10px] font-black text-green-700">{loan.disbursed_by_name || 'Unknown Officer'}</div>
                              <div className="text-[9px] font-bold text-green-500 uppercase tracking-widest mt-0.5">ID: {loan.disbursed_by}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {!loading && filteredLoans.length === 0 && (
            <div className="py-20 text-center text-gray-400 italic font-medium uppercase tracking-widest text-sm">No loan records found for {activeFilter}.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

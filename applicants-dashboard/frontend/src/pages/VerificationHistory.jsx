import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

function VerificationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCenters, setExpandedCenters] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchHistory();
  }, [navigate]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/verification-history`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching verification history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCenter = (centerName) => {
    setExpandedCenters(prev => ({
      ...prev,
      [centerName]: !prev[centerName]
    }));
  };

  // Group verification records by Center Name
  const groupedHistory = history.reduce((acc, record) => {
    const center = record.center_name || 'Unknown Center';
    if (!acc[center]) acc[center] = [];
    acc[center].push(record);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-600 text-lg font-bold uppercase tracking-widest">Loading...</div>;

  return (
    <AdminLayout>
      <div className="p-10 max-w-7xl mx-auto w-full">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Verification History</h1>
          <p className="text-gray-500 mt-2 font-medium">Track all loan application approval and rejection activities.</p>
        </header>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant Member</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Responsible Staff</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedHistory).map(([centerName, items]) => {
                const isExpanded = expandedCenters[centerName];
                return (
                  <React.Fragment key={centerName}>
                    {/* Center Header Row */}
                    <tr 
                      className="bg-indigo-50/50 border-y border-indigo-100 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                      onClick={() => toggleCenter(centerName)}
                    >
                      <td colSpan="5" className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                              {centerName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-indigo-950 text-sm uppercase tracking-wider">{centerName}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{items.length} Verifications</span>
                                {items[0]?.display_staff_branch && (
                                  <>
                                    <span className="text-indigo-300 text-[10px] font-bold">•</span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold uppercase tracking-wider text-[8px]">
                                      {items[0].display_staff_branch} Branch
                                    </span>
                                  </>
                                )}
                              </div>
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
                    
                    {/* Collapsible Member Rows */}
                    {isExpanded && items.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/60 transition group border-b border-gray-50 last:border-0">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{record.applicant_name || 'Unknown Applicant'}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {String(record.id).split('-')[0]}...</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${record.status === 'APPROVED'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {record.ro_id && (
                              <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-100 text-left min-w-24">
                                <div className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Submitted By</div>
                                <div className="text-[9px] font-black text-gray-700 truncate max-w-[100px]">{record.ro_name || 'Unknown RO'}</div>
                                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {record.ro_id}</div>
                              </div>
                            )}
                            {record.verifier_id && (
                              <div className="bg-indigo-50 rounded-lg p-1.5 border border-indigo-100 text-left min-w-24">
                                <div className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Verified By</div>
                                <div className="text-[9px] font-black text-indigo-700 truncate max-w-[100px]">{record.verifier_name || 'Unknown Verifier'}</div>
                                <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">ID: {record.verifier_id}</div>
                              </div>
                            )}
                            {record.disbursed_by && (
                              <div className="bg-green-50 rounded-lg p-1.5 border border-green-100 text-left min-w-24">
                                <div className="text-[7px] font-bold text-green-500 uppercase tracking-widest mb-0.5">Disbursed By</div>
                                <div className="text-[9px] font-black text-green-700 truncate max-w-[100px]">{record.disbursed_by_name || 'Unknown Officer'}</div>
                                <div className="text-[8px] font-bold text-green-500 uppercase tracking-widest mt-0.5">ID: {record.disbursed_by}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-xs font-bold text-gray-600">
                            {record.verified_at ? new Date(record.verified_at).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {record.verified_at ? new Date(record.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 line-clamp-2 italic font-medium max-w-xs">
                            {record.verification_remarks || <span className="text-gray-300 font-normal">No remarks provided</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="italic">No verification history found yet</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default VerificationHistory;

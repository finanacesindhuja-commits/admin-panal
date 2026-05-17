import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

export default function PDTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCenters, setExpandedCenters] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchPD();
  }, [navigate]);

  const fetchPD = async () => {
    try {
      const response = await axios.get(`${API_URL}/pd-verifications/all`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching PD:', error);
    } finally {
      setLoading(false);
    }
  };



  const groupedData = data.reduce((acc, item) => {
    const center = item.center_name || 'Unknown Center';
    if (!acc[center]) acc[center] = [];
    acc[center].push(item);
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
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">PD Verification Activity</h1>
          <p className="text-gray-500 mt-2 font-medium">Track all Personal Discussion (PD) verification activities.</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Images</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">Verification Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching Data...</span>
                    </div>
                  </td>
                </tr>
              ) : Object.entries(groupedData).map(([centerName, items]) => {
                const isExpanded = expandedCenters[centerName];
                return (
                <React.Fragment key={centerName}>
                  <tr 
                    className="bg-indigo-50/50 border-y border-indigo-100 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                    onClick={() => toggleCenter(centerName)}
                  >
                    <td colSpan="4" className="px-8 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                            {centerName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-indigo-950 text-sm uppercase tracking-wider">{centerName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="text-[10px] font-bold uppercase tracking-widest">
                                {(() => {
                                  const pending = items.filter(i => i.status?.toLowerCase().includes('pending')).length;
                                  const completed = items.length - pending;
                                  return (
                                    <>
                                      {pending > 0 && <span className="text-orange-600">{pending} Pending</span>}
                                      {pending > 0 && completed > 0 && <span className="mx-1 text-gray-300">|</span>}
                                      {completed > 0 && <span className="text-green-600">{completed} Completed</span>}
                                      {pending === 0 && completed === 0 && <span className="text-gray-400">0 Verifications</span>}
                                    </>
                                  );
                                })()}
                              </div>
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
                  {isExpanded && items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-900">{item.member_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {item.member_id}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                          item.status === 'Completed' || item.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex justify-center -space-x-2">
                           {[item.home_image, item.side_image].filter(Boolean).map((img, i) => (
                             <img key={i} src={img} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                           ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-left">
                        <div className="text-[10px] font-bold text-gray-400 mb-1">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          {item.original_staff_id && (
                            <div className="bg-orange-50 rounded-lg p-2 border border-orange-100 inline-block min-w-24 mr-2 mb-2">
                              <div className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Submitted By (RO)</div>
                              <div className="text-[10px] font-black text-orange-700">{item.display_staff_name || 'Unknown Staff'}</div>
                              <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">ID: {item.original_staff_id}</div>
                            </div>
                          )}
                          {item.verifier_id && (
                            <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100 inline-block min-w-24">
                              <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">PD Verified By</div>
                              <div className="text-[10px] font-black text-indigo-700">{item.verifier_name || 'Unknown Verifier'}</div>
                              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">ID: {item.verifier_id}</div>
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
        </div>
      </div>
    </AdminLayout>
  );
}

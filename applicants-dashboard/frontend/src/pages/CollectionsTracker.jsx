import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

export default function CollectionsTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchCollections();
  }, [navigate]);

  const fetchCollections = async () => {
    try {
      const response = await axios.get(`${API_URL}/collections/all`);
      const today = new Date().toISOString().split('T')[0];
      const pendingCollections = response.data.filter(
        item => item.status === 'Approved' && item.scheduled_date <= today
      );
      setData(pendingCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-600 text-lg font-bold uppercase tracking-widest">Loading...</div>;

  return (
    <AdminLayout>
      <div className="p-10 max-w-7xl mx-auto w-full">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Collection Activity</h1>
          <p className="text-gray-500 mt-2 font-medium">Monitor all loan collection schedules and payments.</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Center / Group</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Assigned Agent</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Amount Due</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Date</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-gray-900">{item.center_name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Week: {item.week_number}</div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {item.assigned_agent_id ? (
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 inline-block min-w-24">
                        <div className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Collected By</div>
                        <div className="text-[10px] font-black text-blue-700">{item.assigned_agent_name || 'Unknown Agent'}</div>
                        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">ID: {item.assigned_agent_id}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center font-black text-gray-900">₹{item.amount}</td>
                  <td className="px-8 py-5 text-center font-bold text-gray-400 text-xs">
                    {new Date(item.scheduled_date).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      item.status === 'Paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

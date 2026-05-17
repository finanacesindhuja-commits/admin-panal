import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchAttendance();
  }, [navigate, selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/attendance/today?date=${selectedDate}`);
      setAttendance(response.data);
      
      const present = response.data.filter(a => a.status === 'PRESENT').length;
      setStats({
        present,
        absent: response.data.length - present
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      // If it's just a time string like "09:30:00", new Date() might fail.
      if (isNaN(date.getTime())) return isoString; 
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-600 text-lg font-bold uppercase tracking-widest">Loading...</div>;

  return (
    <AdminLayout>
      <div className="p-10 max-w-7xl mx-auto w-full">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">HR Attendance</h1>
            <p className="text-gray-500 mt-2 font-medium">Monitor daily staff check-ins and performance.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Select Attendance Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 text-indigo-950 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
              />
            </div>
            <div className="flex gap-4">
              <div className="bg-green-50 border border-green-100 px-6 py-3 rounded-2xl">
                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Present</p>
                <p className="text-2xl font-black text-green-700">{stats.present}</p>
              </div>
              <div className="bg-red-50 border border-red-100 px-6 py-3 rounded-2xl">
                <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">Absent</p>
                <p className="text-2xl font-black text-red-700">{stats.absent}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Details</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Check-In</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Check-Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendance.map((staff) => (
                <tr key={staff.staff_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        {staff.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{staff.name || 'Unknown Staff'}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{staff.role || 'No Role'} • {staff.staff_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      staff.status === 'PRESENT'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center font-mono text-sm font-bold text-gray-600">
                    {formatTime(staff.check_in)}
                  </td>
                  <td className="px-8 py-5 text-center font-mono text-sm font-bold text-gray-600">
                    {formatTime(staff.check_out)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendance.length === 0 && (
            <div className="py-20 text-center text-gray-400">
              <p className="italic">No staff records found.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

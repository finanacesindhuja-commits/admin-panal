import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');
// HR Attendance backend has the live staff location data from check-ins
const HR_API_URL = import.meta.env.VITE_HR_API_URL || (import.meta.env.PROD ? 'https://hr-attendance-dx3c.onrender.com' : 'http://localhost:5002');

export default function LiveMap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    console.log('📡 Connecting to live tracking radar...');
    addLog('System Initializing...');
    
    // Initialize socket
    // Connect to HR Attendance backend for live staff locations
    socketRef.current = io(HR_API_URL);

    const socket = socketRef.current;

    socket.on('connect', () => {
      setLoading(false);
      setError(null);
      addLog('Ready: Connected to Server');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection Error:', err);
      setError("Unable to connect to live radar.");
      setLoading(false);
      addLog(`Error: ${err.message || 'Connection Failed'}`);
    });

    // Listen for real-time updates from backend
    socket.on('initial-locations', (data) => {
      console.log('📦 Received initial locations:', data);
      setLocations(data);
      setLoading(false);
      addLog(`System: Restored ${data.length} active sessions`);
    });

    socket.on('live-location-update', (data) => {
      addLog(`Signal: Update from ${data.name || data.staff_id}`);
      setLocations(prev => {
        const index = prev.findIndex(l => l.staff_id === data.staff_id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    // Optional: Initial fetch as fallback
    const fetchInitialData = async () => {
      try {
        const response = await axios.get(`${HR_API_URL}/staff/locations`);
        if (response.data && response.data.length > 0) {
           setLocations(response.data);
           addLog(`System: Fetched ${response.data.length} sessions via API`);
        }
      } catch (err) {
        console.warn('Initial API fetch failed, relying on socket:', err);
      }
    };
    fetchInitialData();

    return () => {
      socket.disconnect();
    };
  }, []);

  const forceRefresh = () => {
     window.location.reload();
  };

  return (
    <AdminLayout>
      <main className="max-w-7xl mx-auto w-full p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">Staff Monitoring</h2>
            <p className="text-gray-500 mt-2 font-medium">Real-time GPS visibility for active staff members on duty.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`bg-white border rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-bold shadow-sm ${error ? 'border-red-100 text-red-600' : 'border-gray-100 text-gray-600'}`}>
               <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-500' : 'bg-green-500'}`}></span>
               {loading ? 'CONNECTING...' : error ? 'DISCONNECTED' : 'LIVE RADAR ACTIVE'}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-bold text-gray-600 shadow-sm">
               <span className="text-indigo-600 font-black">{locations.length}</span> STAFF
            </div>
            <button 
              onClick={forceRefresh}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-500 active:scale-95"
              title="Force Refresh"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Search Bar - NEW */}
        <div className="mb-8 max-w-2xl">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedQuery(searchQuery);
            }}
            className="flex gap-3"
          >
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text"
                placeholder="Enter Staff Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none font-medium text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSubmittedQuery('');
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button 
              type="submit"
              className="px-8 bg-gray-900 text-white font-black rounded-[1.5rem] hover:bg-indigo-600 transition-all shadow-lg active:scale-95 text-[10px] uppercase tracking-widest whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-800 mb-8 animate-in fade-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg leading-tight">Connection Issue</h4>
              <p className="text-sm opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-indigo-50 border-t-indigo-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-gray-400 mt-6 font-bold uppercase tracking-widest text-[10px]">Syncing live data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {locations.length === 0 ? (
              <div className="col-span-full py-32 text-center bg-indigo-50/30 rounded-[3rem] border-2 border-dashed border-indigo-100/50 flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center text-indigo-400 mb-8 border border-indigo-100/50">
                   <svg className="w-12 h-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <circle cx="12" cy="11" r="3" strokeWidth={1.5} />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-indigo-900 tracking-tight uppercase">No Active Staff</h3>
                <p className="text-indigo-400 font-medium max-w-sm mx-auto mt-4 leading-relaxed">Staff will appear here automatically once they check in via the HR Attendance app.</p>
              </div>
            ) : (
              <>
                {submittedQuery.trim() === '' ? (
                  <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center text-gray-300 mb-8 border border-gray-100">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight uppercase">Search for Staff</h3>
                    <p className="text-gray-400 font-medium max-w-sm mx-auto mt-4 leading-relaxed">Enter a Staff Name or ID in the search bar above to locate them on the live radar.</p>
                  </div>
                ) : (
                  <>
                    <div className="col-span-full flex justify-between items-center bg-indigo-50/50 px-6 py-4 rounded-3xl border border-indigo-100">
                      <h3 className="text-sm font-bold text-indigo-900 tracking-wider">Search Results for "{submittedQuery}"</h3>
                      <button 
                        onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }} 
                        className="text-[10px] font-black text-red-600 hover:text-white hover:bg-red-500 bg-red-100 px-5 py-2.5 rounded-2xl transition-all uppercase tracking-widest cursor-pointer shadow-sm hover:shadow-md"
                      >
                        Close
                      </button>
                    </div>
                    {locations
                      .filter(loc =>
                        (loc.staff?.name || loc.name || '').toLowerCase().includes(submittedQuery.toLowerCase()) ||
                        (loc.staff_id || '').toLowerCase().includes(submittedQuery.toLowerCase())
                      )
                      .map((loc) => {
                        const isOnline = (new Date() - new Date(loc.timestamp)) <= 8 * 60 * 60 * 1000;
                        return (
                        <div key={loc.staff_id} className={`group bg-white rounded-[2.5rem] p-6 border shadow-[0_4px_25px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 relative overflow-hidden ${isOnline ? 'border-gray-100' : 'border-red-100/50 opacity-90'}`}>
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border shadow-inner group-hover:scale-110 transition-transform duration-500 ${isOnline ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 border-indigo-200/50' : 'bg-gradient-to-br from-gray-50 to-gray-100/50 text-gray-500 border-gray-200/50 grayscale-[50%]'}`}>
                                  {loc.staff?.name?.charAt(0) || loc.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <h3 className="font-extrabold text-gray-950 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors uppercase">{loc.staff?.name || loc.name || 'Unknown'}</h3>
                                  <p className="text-[10px] text-gray-400 font-mono mt-1 font-bold uppercase tracking-tight">{loc.staff_id}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mb-2 border ${isOnline ? 'bg-green-50 text-green-600 border-green-100/50' : 'bg-red-50 text-red-600 border-red-100/50'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                  {isOnline ? 'Live' : 'Offline'}
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-3xl p-5 mb-6 border border-gray-100 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Latitude</p>
                                <p className="font-mono text-xs font-bold text-gray-700 bg-white border border-gray-100 rounded-lg p-2 text-center">{loc.latitude?.toFixed(5)}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Longitude</p>
                                <p className="font-mono text-xs font-bold text-gray-700 bg-white border border-gray-100 rounded-lg p-2 text-center">{loc.longitude?.toFixed(5)}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between px-2 mb-6">
                              <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                                  <p className={`text-xs font-black uppercase ${isOnline ? 'text-indigo-500' : 'text-red-500'}`}>
                                    {isOnline ? 'Signals Normal' : 'Signal Lost'}
                                  </p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Last Update</p>
                                  <p className="text-[10px] font-bold text-gray-600">{new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>

                            <a 
                              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-4 bg-gray-900 group-hover:bg-indigo-600 text-white text-[11px] font-black rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-gray-200 group-hover:shadow-indigo-200 ring-4 ring-transparent hover:ring-indigo-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <circle cx="12" cy="11" r="3" strokeWidth={2.5} />
                              </svg>
                              LOCATE LIVE POSITION
                            </a>
                          </div>
                        </div>
                      );
                    })}
                    {locations.filter(loc =>
                      (loc.staff?.name || loc.name || '').toLowerCase().includes(submittedQuery.toLowerCase()) ||
                      (loc.staff_id || '').toLowerCase().includes(submittedQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center text-gray-300 mb-8 border border-gray-100">
                          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight uppercase">No Results Found</h3>
                        <p className="text-gray-400 font-medium max-w-sm mx-auto mt-4 leading-relaxed">No staff matching "{submittedQuery}" detected on the live radar.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Debug Console */}
        <div className="mt-12 bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-4 px-2">
             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">System Console / Debug</h4>
             <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/30"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/30"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/30"></div>
             </div>
          </div>
          <div className="font-mono text-[10px] space-y-1.5">
            {logs.map((log, i) => (
              <p key={i} className={`${log.includes('Signal') ? 'text-green-400' : log.includes('Error') ? 'text-red-400' : 'text-gray-400'} opacity-80`}>
                <span className="opacity-40 ml-1 mr-2">{'>'}</span> {log}
              </p>
            ))}
            {logs.length === 0 && <p className="text-gray-600 italic px-2">Awaiting system events...</p>}
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="mt-auto px-10 py-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-[10px] font-black">AD</div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2026 Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-8">
          <button className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Support Portal</button>
          <button className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Export Logs</button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Live v2.4</span>
          </div>
        </div>
      </footer>
    </AdminLayout>
  );
}

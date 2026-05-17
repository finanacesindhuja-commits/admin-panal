import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');
const HR_API_URL = import.meta.env.VITE_HR_API_URL || (import.meta.env.PROD ? 'https://hr-attendance-dx3c.onrender.com' : 'http://localhost:5002');

// Route Map Modal using Leaflet (no API key needed)
function RouteMapModal({ staffId, staffName, onClose }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const fetchRoute = async (date) => {
    setRouteLoading(true);
    try {
      const res = await axios.get(`${API_URL}/staff/route-history/${staffId}?date=${date}`);
      setRouteData(res.data);
    } catch (e) {
      console.error('Route fetch error:', e);
      setRouteData({ route: [] });
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => { fetchRoute(routeDate); }, [staffId, routeDate]);

  useEffect(() => {
    if (!routeData || routeLoading) return;
    if (!mapRef.current) return;

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      // Inject CSS if not already done
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet script if not present
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const L = window.L;

      // Destroy existing map
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const route = routeData.route || [];
      const center = route.length > 0
        ? [route[Math.floor(route.length / 2)].latitude, route[Math.floor(route.length / 2)].longitude]
        : [10.3616, 78.0066]; // Thiruvarur default

      const map = L.map(mapRef.current).setView(center, 14);
      leafletMapRef.current = map;

      // OpenStreetMap tiles - free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      if (route.length === 0) return;

      const points = route.map(p => [p.latitude, p.longitude]);

      // Draw route polyline
      L.polyline(points, { color: '#6366f1', weight: 4, opacity: 0.8 }).addTo(map);

      // Start marker (green)
      const startIcon = L.divIcon({
        html: `<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        className: '', iconAnchor: [7, 7]
      });
      L.marker(points[0], { icon: startIcon }).addTo(map).bindPopup(`<b>Start</b><br>${new Date(route[0].timestamp).toLocaleTimeString()}`);

      // End marker (red)
      const endIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        className: '', iconAnchor: [7, 7]
      });
      L.marker(points[points.length - 1], { icon: endIcon }).addTo(map)
        .bindPopup(`<b>Last Seen</b><br>${new Date(route[route.length - 1].timestamp).toLocaleTimeString()}`);

      map.fitBounds(L.latLngBounds(points).pad(0.15));
    };

    loadLeaflet();
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [routeData, routeLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Travel Route</div>
            <h2 className="text-xl font-extrabold text-gray-950">{staffName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={routeDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setRouteDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 transition">✕</button>
          </div>
        </div>

        {/* Stats bar */}
        {routeData && (
          <div className="flex gap-6 px-8 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600">
            <span>📍 <span className="text-indigo-700">{routeData.route?.length || 0}</span> Location Pings</span>
            {routeData.route?.length > 0 && (
              <>
                <span>🟢 Start: {new Date(routeData.route[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>🔴 Last: {new Date(routeData.route[routeData.route.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            )}
          </div>
        )}

        {/* Map */}
        <div className="relative" style={{ height: '420px' }}>
          {routeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
            </div>
          )}
          {!routeLoading && routeData?.route?.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <span className="text-4xl mb-3">🗺️</span>
              <p className="font-bold text-gray-500">No travel data for this date</p>
              <p className="text-xs text-gray-400 mt-1">Staff has no location pings recorded</p>
            </div>
          )}
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

export default function LiveMap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [routeModal, setRouteModal] = useState(null); // { staffId, staffName }
  const navigate = useNavigate();

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    addLog('System Initializing...');

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/staff/locations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data?.length > 0) { 
          setLocations(res.data); 
          addLog(`System: Fetched ${res.data.length} active sessions from Database`); 
          setLoading(false);
          setError(null);
        } else {
          setLocations([]);
          setLoading(false);
        }
      } catch (e) { 
        console.warn('API fetch failed:', e); 
        setError('Failed to sync live data. Retrying...');
        setLoading(false);
      }
    };
    fetchData();
    
    // Poll every 10 seconds for live updates
    const pollInterval = setInterval(fetchData, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [navigate]);

  const filteredLocations = submittedQuery.trim()
    ? locations.filter(loc =>
        (loc.staff?.name || loc.name || '').toLowerCase().includes(submittedQuery.toLowerCase()) ||
        (loc.staff_id || '').toLowerCase().includes(submittedQuery.toLowerCase())
      )
    : locations;

  return (
    <AdminLayout>
      {routeModal && (
        <RouteMapModal
          staffId={routeModal.staffId}
          staffName={routeModal.staffName}
          onClose={() => setRouteModal(null)}
        />
      )}

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
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">
              <span className="text-indigo-600 font-black">{locations.length}</span> STAFF
            </div>
            <button onClick={() => window.location.reload()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="mb-8 max-w-2xl">
          <form onSubmit={e => { e.preventDefault(); setSubmittedQuery(searchQuery); }} className="flex gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input type="text" placeholder="Enter Staff Name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition outline-none font-medium text-gray-900 placeholder:text-gray-400" />
            </div>
            <button type="submit" className="px-8 bg-gray-900 text-white font-black rounded-[1.5rem] hover:bg-indigo-600 transition shadow-lg text-[10px] uppercase tracking-widest">Search</button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-800 mb-8">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
            <div><h4 className="font-bold text-lg">Connection Issue</h4><p className="text-sm opacity-80 mt-1">{error}</p></div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-indigo-50 border-t-indigo-600"></div>
            <p className="text-gray-400 mt-6 font-bold uppercase tracking-widest text-[10px]">Syncing live data...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="py-32 text-center bg-indigo-50/30 rounded-[3rem] border-2 border-dashed border-indigo-100/50 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center text-indigo-400 mb-8 border border-indigo-100/50 text-4xl">📡</div>
            <h3 className="text-2xl font-extrabold text-indigo-900 tracking-tight uppercase">No Active Staff</h3>
            <p className="text-indigo-400 font-medium max-w-sm mx-auto mt-4">Staff will appear here once they check in via the HR app.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {submittedQuery && (
              <div className="col-span-full flex justify-between items-center bg-indigo-50/50 px-6 py-4 rounded-3xl border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-900">Results for "{submittedQuery}"</h3>
                <button onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }} className="text-[10px] font-black text-red-600 bg-red-100 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-2xl transition uppercase tracking-widest">Clear</button>
              </div>
            )}
            {(submittedQuery ? filteredLocations : locations).map(loc => {
              const isOnline = (new Date() - new Date(loc.timestamp)) <= 8 * 60 * 60 * 1000;
              const name = loc.staff?.name || loc.name || 'Unknown';
              return (
                <div key={loc.staff_id} className={`group bg-white rounded-[2rem] p-6 border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isOnline ? 'border-gray-100' : 'border-red-100/50 opacity-90'}`}>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border ${isOnline ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-tight">{name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{loc.staff_id}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black border ${isOnline ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></span>
                      {isOnline ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Latitude</p>
                      <p className="font-mono text-[11px] font-bold text-gray-700">{loc.latitude?.toFixed(5)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Longitude</p>
                      <p className="font-mono text-[11px] font-bold text-gray-700">{loc.longitude?.toFixed(5)}</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-400 font-bold text-center mb-4">
                    Last ping: {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Two action buttons */}
                  <div className="flex gap-2">
                    <a href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-3 bg-gray-900 hover:bg-indigo-600 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 transition">
                      📍 Live Spot
                    </a>
                    <button
                      onClick={() => setRouteModal({ staffId: loc.staff_id, staffName: name })}
                      className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 transition border border-indigo-100">
                      🗺️ Route Map
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Console */}
        <div className="mt-12 bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">System Console</h4>
          <div className="font-mono text-[10px] space-y-1.5">
            {logs.map((log, i) => (
              <p key={i} className={`${log.includes('Signal') ? 'text-green-400' : log.includes('Error') ? 'text-red-400' : 'text-gray-400'} opacity-80`}>
                <span className="opacity-40 mr-2">{'>'}</span>{log}
              </p>
            ))}
            {logs.length === 0 && <p className="text-gray-600 italic">Awaiting system events...</p>}
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

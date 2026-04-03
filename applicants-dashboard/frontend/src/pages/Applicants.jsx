import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5050');

function Applicants() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchApplicants();
  }, [navigate]);

  const fetchApplicants = async () => {
    try {
      const response = await axios.get(`${API_URL}/applicants`);
      setApplicants(response.data);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const response = await axios.post(`${API_URL}/approve/${id}`);
      const { message, staff_id, email_sent } = response.data;
      let msg = `${message}${staff_id ? `\n\nStaff ID: ${staff_id}` : ''}`;
      msg += email_sent ? '\n\n📧 Appointment Email Sent!' : '\n\n⚠️ Email could not be sent.';
      alert(msg);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', staff_id } : a));
      if (selectedApplicant?.id === id) setSelectedApplicant(prev => ({ ...prev, status: 'approved', staff_id }));
    } catch (err) {
      alert(`Approval Failed!\n${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await axios.post(`${API_URL}/reject/${id}`);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      if (selectedApplicant?.id === id) setSelectedApplicant(prev => ({ ...prev, status: 'rejected' }));
    } catch {
      alert('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this applicant?')) return;
    setProcessingId(id);
    try {
      await axios.delete(`${API_URL}/applicants/${id}`);
      setApplicants(prev => prev.filter(a => a.id !== id));
      setSelectedApplicant(null);
    } catch {
      alert('Failed to delete.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-600 text-lg font-bold uppercase tracking-widest">Loading...</div>;

  return (
    <AdminLayout>
      <div className="p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Applicants Management</h1>
          <p className="text-gray-500 mt-2 font-medium">Review and manage appointment selections.</p>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
              <h3 className="text-2xl font-black text-gray-900">{applicants.length}</h3>
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-500 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Pending</p>
              <h3 className="text-2xl font-black text-orange-700">{applicants.filter(a => a.status === 'pending').length}</h3>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Approved</p>
              <h3 className="text-2xl font-black text-green-700">{applicants.filter(a => a.status === 'approved').length}</h3>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Rejected</p>
              <h3 className="text-2xl font-black text-red-700">{applicants.filter(a => a.status === 'rejected').length}</h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-3">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
              placeholder="Search by name, mobile, or staff ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(searchQuery)}
            />
          </div>
          <button 
            onClick={() => setAppliedSearch(searchQuery)}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition flex items-center gap-2"
          >
            Search
          </button>
          
          {appliedSearch && (
            <button 
              onClick={() => { setSearchQuery(''); setAppliedSearch(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Clear
            </button>
          )}
        </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Photo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Role</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Staff ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Police Cert</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applicants.filter(app => 
              app.name?.toLowerCase().includes(appliedSearch.toLowerCase()) ||
              app.mobile?.includes(appliedSearch) ||
              app.staff_id?.toLowerCase().includes(appliedSearch.toLowerCase())
            ).map(app => (
              <tr key={app.id} className="hover:bg-gray-50/60 transition border-b border-gray-50 last:border-0">
                <td className="px-6 py-4">
                  {app.image_url
                    ? <img src={app.image_url} alt={app.name} className="w-11 h-11 rounded-full object-cover border border-gray-200" />
                    : <div className="w-11 h-11 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400">NO IMG</div>
                  }
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{app.name}</div>
                  {app.fathers_name && <div className="text-xs text-gray-400">S/O: {app.fathers_name}</div>}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {app.role || 'Staff'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {app.staff_id
                    ? <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">{app.staff_id}</span>
                    : <span className="text-gray-300 text-xs italic">—</span>
                  }
                </td>
                <td className="px-6 py-4 text-center">
                  {(app.police_verification_url || app.police_certificate_url) ? (
                    <div className="flex flex-col items-center gap-1">
                      <a 
                        href={app.police_verification_url || app.police_certificate_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group relative"
                      >
                         <img 
                          src={app.police_verification_url || app.police_certificate_url} 
                          alt="Police Cert" 
                          className="w-10 h-10 rounded-lg object-cover border border-green-200 hover:scale-110 transition shadow-sm"
                        />
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                           <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                           </svg>
                        </div>
                      </a>
                      <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">VERIFIED</span>
                    </div>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-black bg-yellow-50 text-yellow-600 border border-yellow-100 uppercase tracking-tighter">
                      PENDING
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    app.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  }`}>
                    {app.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setSelectedApplicant(app)}
                    className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 transition"
                  >
                    VIEW
                  </button>
                </td>
              </tr>
            ))}
            {applicants.filter(app => 
              app.name?.toLowerCase().includes(appliedSearch.toLowerCase()) ||
              app.mobile?.includes(appliedSearch) ||
              app.staff_id?.toLowerCase().includes(appliedSearch.toLowerCase())
            ).length === 0 && (
              <tr><td colSpan="7" className="py-12 text-center text-gray-400 italic">No applicants found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Full Detail Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                {selectedApplicant.image_url
                  ? <img src={selectedApplicant.image_url} alt="" className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-100" />
                  : <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed flex items-center justify-center text-gray-300 font-bold">?</div>
                }
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedApplicant.name}</h2>
                  <p className="text-sm text-gray-500">S/O: {selectedApplicant.fathers_name || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApplicant(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[110px] bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Status</div>
                  <div className={`text-sm font-bold uppercase ${selectedApplicant.status === 'approved' ? 'text-green-600' : selectedApplicant.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {selectedApplicant.status || 'pending'}
                  </div>
                </div>
                {selectedApplicant.staff_id && (
                  <div className="flex-1 min-w-[110px] bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="text-[10px] text-blue-500 font-bold uppercase mb-1">Staff ID</div>
                    <div className="text-sm font-mono font-bold text-blue-700">{selectedApplicant.staff_id}</div>
                  </div>
                )}
                <div className="flex-1 min-w-[110px] bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="text-[10px] text-indigo-500 font-bold uppercase mb-1">Role</div>
                  <div className="text-sm font-bold text-indigo-700 uppercase">{selectedApplicant.role || 'Staff'}</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-4">Personal & Contact</h3>
                  <div className="space-y-3 text-sm">
                    {selectedApplicant.mothers_name && <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Mother:</span><span className="font-medium">{selectedApplicant.mothers_name}</span></div>}
                    <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Mobile:</span><span className="font-medium">{selectedApplicant.mobile}</span></div>
                    {selectedApplicant.alternative_mobile && <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Alt No:</span><span className="font-medium">{selectedApplicant.alternative_mobile}</span></div>}
                    <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Email:</span><span className="font-medium text-blue-600 break-all">{selectedApplicant.email || 'N/A'}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-4">Professional Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Experience:</span><span className="font-medium">{selectedApplicant.experience}</span></div>
                    <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Education:</span><span className="font-medium">{selectedApplicant.degree || 'N/A'}</span></div>
                    <div className="flex gap-3"><span className="w-20 text-gray-400 shrink-0">Area:</span><span className="font-medium">{selectedApplicant.area || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
              {/* Documents */}
              {[selectedApplicant.image_url, selectedApplicant.police_verification_url, selectedApplicant.police_certificate_url, selectedApplicant.cert_10th_url, selectedApplicant.cert_12th_url, selectedApplicant.cert_degree_url].some(Boolean) && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-3">Attachments & Verification</h3>
                  
                  {/* Police Certificate Preview - NEW */}
                  {(selectedApplicant.police_verification_url || selectedApplicant.police_certificate_url) && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 px-1">Police Verification Document</p>
                      <img 
                        src={selectedApplicant.police_verification_url || selectedApplicant.police_certificate_url} 
                        alt="Police Verification" 
                        className="w-full max-h-64 object-contain rounded-xl border-2 border-white shadow-lg bg-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedApplicant.image_url && <a href={selectedApplicant.image_url} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition">FULL PHOTO</a>}
                    {(selectedApplicant.police_verification_url || selectedApplicant.police_certificate_url) && <a href={selectedApplicant.police_verification_url || selectedApplicant.police_certificate_url} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 hover:bg-purple-100 transition">OPEN CERT</a>}
                    {selectedApplicant.cert_10th_url && <a href={selectedApplicant.cert_10th_url} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-bold border border-orange-100 hover:bg-orange-100 transition">10TH CERT</a>}
                    {selectedApplicant.cert_12th_url && <a href={selectedApplicant.cert_12th_url} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100 hover:bg-green-100 transition">12TH CERT</a>}
                    {selectedApplicant.cert_degree_url && <a href={selectedApplicant.cert_degree_url} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition">DEGREE CERT</a>}
                  </div>
                </div>
              )}

              {/* Actions inside modal */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(selectedApplicant.id)} disabled={selectedApplicant.status === 'approved' || processingId === selectedApplicant.id}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-40">
                    {processingId === selectedApplicant.id ? 'PROCESSING...' : 'APPROVE'}
                  </button>
                  <button onClick={() => handleReject(selectedApplicant.id)} disabled={selectedApplicant.status === 'rejected' || processingId === selectedApplicant.id}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition disabled:opacity-40">
                    REJECT
                  </button>
                </div>
                <button onClick={() => handleDelete(selectedApplicant.id)} disabled={processingId === selectedApplicant.id}
                  className="w-full py-2 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl text-xs font-bold transition">
                  🗑 DELETE RECORD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </AdminLayout>
);
}

export default Applicants;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Applicants from './pages/Applicants';
import LiveMap from './pages/LiveMap';
import VerificationHistory from './pages/VerificationHistory';
import MasterTracking from './pages/MasterTracking';
import './index.css';

// Global Axios Interceptors for Authentication
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

axios.interceptors.response.use((response) => response, (error) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    // If the server rejects the token, force a logout
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tracking" element={<MasterTracking />} />
        <Route path="/applicants" element={<Applicants />} />
        <Route path="/admin/locations" element={<LiveMap />} />
        <Route path="/admin/verification-history" element={<VerificationHistory />} />
      </Routes>
    </Router>
  );
}

export default App;

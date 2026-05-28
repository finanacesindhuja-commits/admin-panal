const express = require('express');
const compression = require('compression');
const NodeCache = require('node-cache');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const cache = new NodeCache({ stdTTL: 15 });
const flushCache = () => cache.flushAll();
const cacheMiddleware = (duration = 15) => (req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  if (cachedResponse) return res.json(cachedResponse);
  res.sendResponse = res.json;
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, body, duration);
    }
    res.sendResponse(body);
  };
  next();
};

app.use(compression());
const http = require('http').createServer(app);

// ✅ Trust proxy for Render/Heroku (required for rate limiting to work correctly)
app.set('trust proxy', 1);

// ✅ Allowed Origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'https://admin-panal-k6n4.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const io = require('socket.io')(http, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"] 
  }
});
const port = process.env.PORT || 5001;

// ✅ Rate Limiter — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again after 15 minutes.' },
});

// Middleware
// ✅ Nuclear CORS Fix: Manual Header Management (Highest Priority)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow if origin is localhost or specifically in our allowed list
  if (!origin || origin.startsWith('http://localhost:') || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  // Handle Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      flushCache();
    }
  });
  next();
});

app.use('/api', limiter);

// In-memory store for live staff locations (volatile)
const liveStaffLocations = new Map();

// GET /staff/locations → Fetch current live locations (for polling fallback)
app.get('/staff/locations', (req, res) => {
  res.json(Array.from(liveStaffLocations.values()));
});

// POST /staff/update-location → Fallback for non-socket updates
app.post('/staff/update-location', (req, res) => {
  const { staff_id, name, latitude, longitude } = req.body;
  
  const locationData = {
    staff_id,
    name,
    latitude,
    longitude,
    timestamp: new Date().toISOString()
  };
  
  liveStaffLocations.set(staff_id, locationData);
  io.emit('live-location-update', locationData);
  res.json({ success: true });
});

io.on('connection', (socket) => {
  console.log('🔌 New client connected');

  // Send current live locations to newly connected client (e.g. Admin)
  socket.emit('initial-locations', Array.from(liveStaffLocations.values()));

  socket.on('staff-location-update', (data) => {
    const { staff_id, name, latitude, longitude } = data;
    console.log(`📍 Received location from ${name} (${staff_id}): ${latitude}, ${longitude}`);
    
    const locationData = {
      staff_id,
      name,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    };
    
    // Store in volatile memory
    liveStaffLocations.set(staff_id, locationData);
    
    // Broadcast to everyone (Admins)
    io.emit('live-location-update', locationData);
    console.log(`📡 Broadcasted update for ${name}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected');
  });
});

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Fixes "self-signed certificate" error
  }
});

// Verify email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email Configuration Error:', error.message);
    console.error('Check if EMAIL_USER and EMAIL_PASS are correct in .env');
  } else {
    console.log('📧 Email Server is ready to send messages');
  }
});

// Health check route
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    time: new Date().toISOString(),
    cors_info: {
      allowed_origins: allowedOrigins,
      manual_cors_active: true
    }
  });
});

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
if(process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("🛡️ Admin Backend using Service Role Key (RLS Bypassed)");
}

// Admin Authentication Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    req.admin = decoded;
    next();
  });
};

// POST /login → Admin login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  if (username === validUsername && password === validPassword) {
    const token = jwt.sign(
      { username, role: 'admin' }, 
      process.env.JWT_SECRET || 'fallback-secret-for-dev', 
      { expiresIn: '24h' }
    );
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

// GET /applicants → fetch all applicants
app.get('/applicants', verifyToken, async (req, res) => {
  try {
    const { data: applicants, error } = await supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });

    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }
    
    // Fetch staff data to merge police_verification_url
    const staffIds = applicants.map(a => a.staff_id).filter(Boolean);
    let staffMap = {};
    
    if (staffIds.length > 0) {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id, police_verification_url')
        .in('staff_id', staffIds);
        
      if (!staffError && staffData) {
        staffData.forEach(s => {
          staffMap[s.staff_id] = s.police_verification_url;
        });
      }
    }

    const mergedData = applicants.map(app => {
      // Prioritize staff table uploaded url, fallback to applicant table
      const svUrl = (app.staff_id && staffMap[app.staff_id]) ? staffMap[app.staff_id] : null;
      return { 
        ...app, 
        police_verification_url: svUrl || app.police_verification_url || app.police_certificate_url 
      };
    });
    
    res.json(mergedData);
  } catch (err) {
    console.error('API Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /approve/:id → approve an applicant and register as staff
app.post('/approve/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get applicant details
    const { data: applicant, error: getError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !applicant) throw new Error('Applicant not found');
    if (applicant.status === 'approved') throw new Error('Applicant already approved');

    // 2. Generate unique staff_id (STF001, STF002...)
    const { data: lastStaff, error: lastStaffError } = await supabase
      .from('staff')
      .select('staff_id')
      .order('staff_id', { ascending: false })
      .limit(1);

    if (lastStaffError) {
      console.error('Error fetching last staff:', lastStaffError);
      throw new Error(`Staff table error: ${lastStaffError.message}. Make sure you created the staff table!`);
    }

    let nextIdNumber = 1;
    if (lastStaff && lastStaff.length > 0) {
      const lastId = lastStaff[0].staff_id;
      const match = lastId.match(/\d+/);
      const currentNumber = match ? parseInt(match[0], 10) : 0;
      nextIdNumber = currentNumber + 1;
    }
    const staffId = `STF${String(nextIdNumber).padStart(3, '0')}`;
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();

    // 3. Update applicant status and staff_id
    const { error: updateError } = await supabase
      .from('applicants')
      .update({ 
        status: 'approved',
        staff_id: staffId 
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Insert into staff table
    const { data: newStaff, error: staffError } = await supabase
      .from('staff')
      .insert([{
        name: applicant.name,
        mobile: applicant.mobile,
        staff_id: staffId,
        password: tempPassword,
        is_password_set: false,
        role: applicant.role || 'Staff'
      }])
      .select();

    if (staffError) {
      console.error('Staff Insert Error:', staffError);
      throw new Error(`Could not create staff record: ${staffError.message}`);
    }

    console.log(`✅ Approved ${applicant.name} and assigned Staff ID: ${staffId}`);

    // 5. Send Appointment Email
    let emailSent = false;
    if (applicant.email && applicant.email.trim() !== '') {
      console.log(`📧 Attempting to send email to: ${applicant.email}`);
      const mailOptions = {
        from: `HR Department <${process.env.EMAIL_USER}>`,
        to: applicant.email.trim(),
        subject: 'Appointment Order - Selection Notification',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">Congratulations!</h1>
              <p style="font-size: 18px; margin-top: 10px;">You have been selected</p>
            </div>
            <div style="padding: 40px; color: #374151; line-height: 1.6;">
              <p>Dear <strong>${applicant.name}</strong>,</p>
              <p>We are pleased to inform you that your application for the position of <strong>${applicant.role || 'Staff'}</strong> has been approved.</p>
              
              <div style="background-color: #F3F4F6; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #E5E7EB;">
                <p style="margin: 0; color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
                
                <div style="margin-top: 15px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 10px; text-transform: uppercase;">Staff ID</p>
                  <p style="margin: 2px 0 0 0; color: #111827; font-size: 18px; font-family: monospace; font-weight: bold;">${staffId}</p>
                  
                  <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 10px; text-transform: uppercase;">Temporary Password</p>
                  <p style="margin: 2px 0 0 0; color: #4F46E5; font-size: 18px; font-family: monospace; font-weight: bold;">${tempPassword}</p>
                </div>
              </div>

              <p>This email serves as your formal <strong>Appointment Order</strong>. You can use the credentials above to log in to our HR portal. For security reasons, please <strong>change your password</strong> immediately after your first login.</p>
              
              <p style="margin-top: 30px;">Welcome to the team!</p>
              <p>Best Regards,<br><strong>HR Department</strong></p>
            </div>
            <div style="background-color: #F9FAFB; padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Applicants Dashboard. All rights reserved.
            </div>
          </div>
        `
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email Sent:', info.response);
        emailSent = true;
      } catch (mailErr) {
        console.error('❌ Email Error:', mailErr.message);
      }
    } else {
      console.log('⚠️ No email address found for applicant. Skipping email notification.');
    }

    res.json({ 
      message: 'Applicant approved and staff record created', 
      staff_id: staffId,
      email_sent: emailSent,
      staff: newStaff[0] 
    });
  } catch (err) {
    console.error('*********************************');
    console.error('❌ APPROVAL SYSTEM ERROR');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('*********************************');
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN ACTIONS ---

// POST /reject/:id → reject an applicant
app.post('/reject/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('applicants')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ message: 'Applicant rejected', applicant: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /applicants/:id → delete an applicant
app.delete('/applicants/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('applicants')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Applicant deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /verification-history → fetch verification logs from loans table
app.get('/verification-history', verifyToken, async (req, res) => {
  try {
    const { data: loans, error } = await supabase
      .from('loans')
      .select('id, person_name, member_name, center_name, status, staff_id, verifier_id, verified_at, verification_remarks, disbursed_by')
      .neq('status', 'PENDING')
      .order('verified_at', { ascending: false });

    if (error) throw error;
    
    // Fetch staff data to resolve verifier, staff, and disburser names
    const { data: staffData } = await supabase.from('staff').select('staff_id, name, branch');
    const staffMap = {};
    if (staffData) {
      staffData.forEach(s => staffMap[s.staff_id] = s);
    }

    // Process names (person_name or member_name) and enrich with verifier/RO names
    const processedLoans = loans.map(loan => {
      const staffInfo = staffMap[loan.staff_id];
      const verifierInfo = loan.verifier_id ? staffMap[loan.verifier_id] : null;
      const disburserInfo = loan.disbursed_by ? staffMap[loan.disbursed_by] : null;

      return {
        ...loan,
        applicant_name: loan.person_name || loan.member_name,
        ro_id: loan.staff_id,
        ro_name: staffInfo ? staffInfo.name : null,
        display_staff_branch: staffInfo ? staffInfo.branch : null,
        verifier_name: verifierInfo ? verifierInfo.name : null,
        disbursed_by_name: disburserInfo ? disburserInfo.name : null
      };
    });

    res.json(processedLoans);
  } catch (err) {
    console.error('Verification History Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /pending-verifications-count → fetch count of pending loans
app.get('/pending-verifications-count', verifyToken, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error('Pending Verifications Count Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /tracking-stats → Unified endpoint for sidebar badges and Master Dashboard
app.get('/tracking-stats', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const results = await Promise.all([
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('pd_verifications').select('*', { count: 'exact', head: true }).eq('status', 'Pending PD Verification'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'SANCTIONED').neq('disbursement_app_status', 'READY'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'SANCTIONED').eq('disbursement_app_status', 'READY'),
      supabase.from('staff_attendance').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('staff').select('*', { count: 'exact', head: true }).neq('role', 'Admin'),
      supabase.from('collection_schedules').select('*', { count: 'exact', head: true }).lte('scheduled_date', today).eq('status', 'Approved'),
      supabase.from('loans').select('amount_sanctioned, credited_at, created_at').eq('status', 'DISBURSED'),
      supabase.from('collection_schedules').select('collected_amount, scheduled_date').in('status', ['Paid', 'Received'])
    ]);

    const counts = results.slice(0, 9).map(r => r.count || 0);
    const [
      hrCount,
      verifierCount,
      pdCount,
      managerCount,
      scheduleCount,
      disbursementCount,
      attendanceCount,
      totalStaffCount,
      collectionCount
    ] = counts;

    const missingAttendanceCount = Math.max(0, totalStaffCount - attendanceCount);

    const disbursedLoans = results[9].data || [];
    const collectionSchedules = results[10].data || [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    let liveMonthTurnover = 0;
    let lastMonthTurnover = 0;

    // Monthly trend data for the chart (last 6 months)
    const monthlyTrend = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = { monthName: d.toLocaleString('default', { month: 'short' }), amount: 0 };
    }

    disbursedLoans.forEach(loan => {
      const dateStr = loan.credited_at || loan.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const amt = Number(loan.amount_sanctioned) || 0;

      // Match current month
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        liveMonthTurnover += amt;
      }

      // Match last month
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      if (d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()) {
        lastMonthTurnover += amt;
      }

      // Match 6-month trend chart
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrend[key]) {
        monthlyTrend[key].amount += amt;
      }
    });

    let liveMonthCollection = 0;
    let lastMonthCollection = 0;

    // Monthly trend data for collection chart (last 6 months)
    const collectionTrend = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      collectionTrend[key] = { monthName: d.toLocaleString('default', { month: 'short' }), amount: 0 };
    }

    collectionSchedules.forEach(sched => {
      const dateStr = sched.scheduled_date;
      if (!dateStr) return;
      
      const parts = dateStr.split('-');
      if (parts.length !== 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      
      const amt = Number(sched.collected_amount) || 0;

      // Match current month
      if (year === currentYear && month === currentMonth) {
        liveMonthCollection += amt;
      }

      // Match last month
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      if (year === lastMonthDate.getFullYear() && month === lastMonthDate.getMonth()) {
        lastMonthCollection += amt;
      }

      // Match 6-month trend chart
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (collectionTrend[key]) {
        collectionTrend[key].amount += amt;
      }
    });

    // Fetch all staff branches to map staff_id -> branch
    const { data: staffBranchData } = await supabase.from('staff').select('staff_id, branch');
    const staffBranchMap = {};
    let defaultBranch = 'Thiruvarur 01'; // Default fallback
    if (staffBranchData && staffBranchData.length > 0) {
      const activeBranch = staffBranchData.find(s => s.branch)?.branch;
      if (activeBranch) defaultBranch = activeBranch;
      
      staffBranchData.forEach(s => staffBranchMap[s.staff_id] = s.branch || defaultBranch);
    }

    // Map member_id -> staff_id -> branch
    const { data: loansForMapping } = await supabase.from('loans').select('member_id, staff_id');
    const memberBranchMap = {};
    if (loansForMapping) {
      loansForMapping.forEach(l => {
        memberBranchMap[l.member_id] = staffBranchMap[l.staff_id] || defaultBranch;
      });
    }

    // Calculate Branch-wise Turnover
    const branchTurnoverStats = {};
    disbursedLoans.forEach(loan => {
      const branch = staffBranchMap[loan.staff_id] || defaultBranch;
      if (!branchTurnoverStats[branch]) {
        branchTurnoverStats[branch] = { live: 0, last: 0 };
      }
      const dateStr = loan.credited_at || loan.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const amt = Number(loan.amount_sanctioned) || 0;
      
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        branchTurnoverStats[branch].live += amt;
      }
      
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      if (d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()) {
        branchTurnoverStats[branch].last += amt;
      }
    });

    const branchTurnoverArray = Object.entries(branchTurnoverStats).map(([branch, values]) => {
      const growth = values.last > 0 ? ((values.live - values.last) / values.last) * 100 : 0;
      return { branch, live: values.live, last: values.last, growth };
    });

    // Calculate Branch-wise Collection
    const branchCollectionStats = {};
    collectionSchedules.forEach(sched => {
      const branch = memberBranchMap[sched.member_id] || defaultBranch;
      if (!branchCollectionStats[branch]) {
        branchCollectionStats[branch] = { live: 0, last: 0 };
      }
      const dateStr = sched.scheduled_date;
      if (!dateStr) return;
      const parts = dateStr.split('-');
      if (parts.length !== 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const amt = Number(sched.collected_amount) || 0;
      
      if (year === currentYear && month === currentMonth) {
        branchCollectionStats[branch].live += amt;
      }
      
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      if (year === lastMonthDate.getFullYear() && month === lastMonthDate.getMonth()) {
        branchCollectionStats[branch].last += amt;
      }
    });

    const branchCollectionArray = Object.entries(branchCollectionStats).map(([branch, values]) => {
      const growth = values.last > 0 ? ((values.live - values.last) / values.last) * 100 : 0;
      return { branch, live: values.live, last: values.last, growth };
    });

    res.json({
      hrDashboard: hrCount,
      hrAttendance: missingAttendanceCount,
      loanApplication: verifierCount, 
      loanVerifier: verifierCount,    
      pdVerification: pdCount,
      managerControl: managerCount,
      managerSchedule: scheduleCount,
      disbursement: disbursementCount,
      collectionControl: collectionCount,
      liveMonthTurnover,
      lastMonthTurnover,
      monthlyTrend: Object.values(monthlyTrend),
      liveMonthCollection,
      lastMonthCollection,
      collectionTrend: Object.values(collectionTrend),
      branchTurnover: branchTurnoverArray,
      branchCollection: branchCollectionArray
    });
  } catch (err) {
    console.error('Tracking Stats Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tracking stats' });
  }
});

// GET /attendance/today → Fetch detailed attendance for today
app.get('/attendance/today', verifyToken, async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];
    
    // 1. Fetch all staff (excluding admins)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('staff_id, name, role')
      .neq('role', 'Admin');

    if (staffError) throw staffError;

    // 2. Fetch target date's attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('date', today);

    if (attendanceError) throw attendanceError;

    // 3. Merge data
    const attendanceMap = new Map(attendance.map(a => [a.staff_id, a]));
    const detailedAttendance = staff.map(s => {
      const log = attendanceMap.get(s.staff_id);
      return {
        staff_id: s.staff_id,
        name: s.name,
        role: s.role,
        status: log ? 'PRESENT' : 'ABSENT',
        check_in: log?.check_in || log?.check_in_time || null,
        check_out: log?.check_out || log?.check_out_time || null,
        location: log?.location || null
      };
    });

    res.json(detailedAttendance);
  } catch (err) {
    console.error('Attendance API Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /staff/locations → Fetch latest location for all active staff
app.get('/staff/locations', verifyToken, async (req, res) => {
  try {
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('staff_id, name, branch');
    
    if (staffError) throw staffError;

    // Get all locations sorted by timestamp descending
    const { data: locations, error: locError } = await supabase
      .from('staff_locations')
      .select('*')
      .order('timestamp', { ascending: false });

    if (locError) throw locError;

    // Get the most recent location for each staff member
    const latestLocations = [];
    const seenStaff = new Set();
    
    locations.forEach(loc => {
      if (!seenStaff.has(loc.staff_id)) {
        seenStaff.add(loc.staff_id);
        const staffInfo = staff.find(s => s.staff_id === loc.staff_id);
        latestLocations.push({
          ...loc,
          staff: staffInfo,
          name: staffInfo?.name
        });
      }
    });

    res.json(latestLocations);
  } catch (err) {
    console.error('Staff Locations Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /staff/route-history/:staff_id → Fetch GPS trail for a staff member for a given date
app.get('/staff/route-history/:staff_id', verifyToken, async (req, res) => {
  try {
    const { staff_id } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Fetch all location pings for this staff on this date
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay   = `${date}T23:59:59.999Z`;

    const { data: locations, error } = await supabase
      .from('staff_locations')
      .select('latitude, longitude, timestamp')
      .eq('staff_id', staff_id)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Fetch staff name
    const { data: staffData } = await supabase
      .from('staff')
      .select('name, branch')
      .eq('staff_id', staff_id)
      .single();

    res.json({
      staff_id,
      staff_name: staffData?.name || staff_id,
      branch: staffData?.branch || 'Unknown',
      date,
      route: locations || []
    });
  } catch (err) {
    console.error('Route History Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /all-activity → Unified feed of everything happening in the system
app.get('/all-activity', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Parallel queries with individual error handling
    const [applicantsRes, loansRes, pdRes, attendanceRes] = await Promise.all([
      supabase.from('applicants').select('name, role, status, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('loans').select('person_name, member_name, status, verified_at, center_name').order('verified_at', { ascending: false }).limit(10),
      supabase.from('pd_verifications').select('member_id, status, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('staff_attendance').select('*')
        .gte('date', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`)
        .order('date', { ascending: false }).limit(10)
    ]);

    const events = [];

    if (!applicantsRes.error && applicantsRes.data) {
      applicantsRes.data.forEach(a => events.push({
        type: 'APPLICANT',
        title: `New Applicant: ${a.name}`,
        subtitle: `Role: ${a.role} | Status: ${a.status}`,
        timestamp: a.created_at,
        color: 'blue'
      }));
    }

    if (!loansRes.error && loansRes.data) {
      loansRes.data.forEach(l => events.push({
        type: 'LOAN',
        title: `Loan: ${l.person_name || l.member_name}`,
        subtitle: `Center: ${l.center_name} | Status: ${l.status}`,
        timestamp: l.verified_at || new Date().toISOString(),
        color: 'indigo'
      }));
    }

    if (!pdRes.error && pdRes.data) {
      pdRes.data.forEach(pd => events.push({
        type: 'PD',
        title: `PD Verification Created`,
        subtitle: `Member ID: ${pd.member_id} | Status: ${pd.status}`,
        timestamp: pd.created_at,
        color: 'rose'
      }));
    }

    if (!attendanceRes.error && attendanceRes.data) {
      attendanceRes.data.forEach(att => events.push({
        type: 'ATTENDANCE',
        title: `Attendance Checked In`,
        subtitle: `Staff ID: ${att.staff_id} | Date: ${att.date}`,
        timestamp: att.check_in || `${att.date}T00:00:00`,
        color: 'green'
      }));
    }

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(events.slice(0, 30));
  } catch (err) {
    console.error('All Activity Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /loans/all → Detailed loan records for internal tracking
app.get('/loans/all', verifyToken, async (req, res) => {
  try {
    const { data: loans, error } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: staffData } = await supabase.from('staff').select('staff_id, name, branch');
    const staffMap = {};
    if (staffData) {
      staffData.forEach(s => staffMap[s.staff_id] = s);
    }

    const enrichedLoans = loans.map(loan => {
       const staffInfo = staffMap[loan.staff_id];
       const verifierInfo = loan.verifier_id ? staffMap[loan.verifier_id] : null;
       const disburserInfo = loan.disbursed_by ? staffMap[loan.disbursed_by] : null;

       return {
          ...loan,
          display_staff_id: loan.staff_id,
          display_staff_name: staffInfo ? staffInfo.name : null,
          display_staff_branch: staffInfo ? staffInfo.branch : null,
          verifier_name: verifierInfo ? verifierInfo.name : null,
          verifier_branch: verifierInfo ? verifierInfo.branch : null,
          disbursed_by_name: disburserInfo ? disburserInfo.name : null
       };
    });

    res.json(enrichedLoans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pd-verifications/all → Detailed PD records
app.get('/pd-verifications/all', verifyToken, async (req, res) => {
  try {
    const { data: pdData, error: pdError } = await supabase
      .from('pd_verifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (pdError) throw pdError;

    const { data: loansData, error: loansError } = await supabase
      .from('loans')
      .select('member_id, center_name, member_name, person_name, staff_id, verifier_id');
    if (loansError) throw loansError;

    const loanMap = {};
    loansData.forEach(l => {
      loanMap[l.member_id] = l;
    });

    const { data: staffData } = await supabase.from('staff').select('staff_id, name, branch');
    const staffMap = {};
    if (staffData) {
      staffData.forEach(s => staffMap[s.staff_id] = s);
    }

    const enrichedData = pdData.map(pd => {
      const loanInfo = loanMap[pd.member_id] || {};
      
      const originalRoInfo = loanInfo.staff_id ? staffMap[loanInfo.staff_id] : null;
      // Resolve the actual verifier who approved it (loans.verifier_id) with fallback to pd.staff_id
      const actualVerifierId = loanInfo.verifier_id || pd.staff_id;
      const verifierInfo = actualVerifierId ? staffMap[actualVerifierId] : null;

      return {
        ...pd,
        center_name: loanInfo.center_name || 'Unknown Center',
        member_name: loanInfo.member_name || loanInfo.person_name || `Member ID: ${pd.member_id}`,
        // Original RO who brought the loan
        original_staff_id: loanInfo.staff_id,
        display_staff_name: originalRoInfo ? originalRoInfo.name : null,
        display_staff_branch: originalRoInfo ? originalRoInfo.branch : null,
        // The Verifier who did the PD
        verifier_id: actualVerifierId,
        verifier_name: verifierInfo ? verifierInfo.name : null,
        verifier_branch: verifierInfo ? verifierInfo.branch : null
      };
    });

    res.json(enrichedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /collections/all → Detailed collection records
app.get('/collections/all', verifyToken, async (req, res) => {
  try {
    const { data: collections, error } = await supabase
      .from('collection_schedules')
      .select('*')
      .order('scheduled_date', { ascending: false });
    if (error) throw error;

    const loanIds = [...new Set(collections.map(c => c.loan_id).filter(Boolean))];
    let loanMap = {};
    if (loanIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('id, staff_id').in('id', loanIds);
      if (loansData) loansData.forEach(l => loanMap[l.id] = l.staff_id);
    }

    const { data: staffData } = await supabase.from('staff').select('staff_id, name, branch');
    const staffMap = {};
    if (staffData) staffData.forEach(s => staffMap[s.staff_id] = s);

    const enrichedCollections = collections.map(c => {
      const roId = loanMap[c.loan_id];
      const staffInfo = roId ? staffMap[roId] : null;
      return {
        ...c,
        assigned_agent_id: roId,
        assigned_agent_name: staffInfo ? staffInfo.name : null,
      };
    });

    res.json(enrichedCollections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Serve Frontend Static Build in Production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendBuildPath));
  // All non-API routes → serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
  console.log(`🌐 Serving frontend from: ${frontendBuildPath}`);
}

http.listen(port, () => {
  console.log(`🚀 Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
});

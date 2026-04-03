const express = require('express');
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
const http = require('http').createServer(app);

// ✅ Trust proxy for Render/Heroku (required for rate limiting to work correctly)
app.set('trust proxy', 1);

// ✅ Allowed Origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
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
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true,
}));
app.use(express.json());
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
  res.json({ message: 'Backend is working!', time: new Date().toISOString() });
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
      .select('id, person_name, member_name, center_name, status, verifier_id, verified_at, verification_remarks')
      .neq('status', 'PENDING')
      .order('verified_at', { ascending: false });

    if (error) throw error;
    
    // Process names (person_name or member_name)
    const processedLoans = loans.map(loan => ({
      ...loan,
      applicant_name: loan.person_name || loan.member_name
    }));

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

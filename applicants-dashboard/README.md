# Applicants Dashboard

Simple Node.js + React application to manage applicants.

## 🚀 Setup Instructions

### 1. Database (Supabase)
- Go to your Supabase SQL Editor.
- Copy the contents of [database.sql](./database.sql) and run it.

### 2. Backend Config
- Go to `backend/.env`.
- Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.

### 3. Run Locally

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Production Deployment

### Backend (Railway / Render / Heroku)
1. Push your code to GitHub.
2. Connect your repository to your hosting provider.
3. Set Environment Variables in the provider's dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `PORT` (automated by most platforms)

### Frontend (Vercel / Netlify)
1. Connect your GitHub repo.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://my-api.railway.app`)

## 🔐 Admin Login
- **Username:** admin
- **Password:** 1234

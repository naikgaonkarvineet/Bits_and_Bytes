# KaamSetu Backend Documentation (Member 2)

Backend service for **KaamSetu** – an accessible labor marketplace connecting Indian daily-wage workers with construction contractors and builders.

Built using **Node.js, Express.js, JavaScript, and Supabase** as requested.

---

## 1. Backend Folder Structure

```
backend/
├── .env.example            # Environment variables template (no secrets)
├── .env                    # Local environment variables (git-ignored)
├── .gitignore              # Ignores node_modules and .env
├── package.json            # Node.js dependencies & scripts
├── server.js               # Express application entry point & static file server
├── schema.sql              # Supabase PostgreSQL schema with tables & indexes
├── test.js                 # Comprehensive automated test suite (29 tests)
├── config/
│   ├── seedData.js         # Initial seed workers, contractors, jobs, assignments
│   └── supabase.js         # Supabase client & resilient data repository
├── middleware/
│   ├── auth.js             # JWT authentication & role-based access control
│   ├── validation.js       # Request data validation
│   └── errorHandler.js     # Centralized error response handler
├── routes/
│   ├── authRoutes.js       # Worker/Contractor registration & login
│   ├── workerRoutes.js     # Worker profile, jobs, status, wages, payments
│   ├── contractorRoutes.js # Contractor profile, jobs, applicants, payments
│   ├── jobRoutes.js        # Public & authenticated job operations
│   ├── assignmentRoutes.js # Work assignments & status transitions
│   └── paymentRoutes.js    # Wage recording & status updates
└── controllers/
    ├── authController.js
    ├── workerController.js
    ├── contractorController.js
    ├── jobController.js
    ├── assignmentController.js
    └── paymentController.js
```

---

## 2. Installation Commands

Navigate to the `backend` folder and install dependencies:

```bash
cd backend
npm install
```

Installed dependencies:
- `express`: Fast HTTP server
- `@supabase/supabase-js`: Official Supabase database client
- `bcryptjs`: Password hashing with salt rounds
- `jsonwebtoken`: Secure JWT token creation and verification
- `cors`: Cross-Origin Resource Sharing
- `dotenv`: Environment variable loader

---

## 3. Environment Variables Required

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
# Server Port
PORT=5000

# Node Environment
NODE_ENV=development

# JWT Secret Key for signing tokens
JWT_SECRET=kaamsetu_super_secure_jwt_secret_key_2026

# Supabase Credentials (optional during local dev, required for live Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> [!NOTE]
> If `SUPABASE_URL` and `SUPABASE_ANON_KEY` are not configured yet, the backend automatically switches to its high-speed in-memory database with full seed data. Everything works 100% out-of-the-box!

---

## 4. How to Start the Backend

### Standard Start:
```bash
npm start
```
or
```bash
node server.js
```

### Development Mode (auto-restart on changes):
```bash
npm run dev
```

The server will start at:
- **API Base URL**: `http://localhost:5000/api`
- **Frontend App**: `http://localhost:5000/index.html` (the server serves the HTML/CSS/JS frontend directly!)

---

## 5. How to Test the APIs

Run the automated test suite covering all endpoints, authentication, role authorization, and data flow:

```bash
npm test
```
or
```bash
node test.js
```

Test coverage includes:
- [x] Health check
- [x] Worker registration (bcrypt hashed, no password leak)
- [x] Contractor registration (bcrypt hashed, no password leak)
- [x] Login with valid and invalid credentials
- [x] Role-based access control (workers forbidden from posting jobs)
- [x] Contractor job creation
- [x] Public job browsing with category filter
- [x] Worker job application
- [x] Contractor applicant review and hiring
- [x] Work status transitions (`Assigned` -> `In Progress` -> `Completed`)
- [x] Automatic payment record generation
- [x] Contractor updates payment status to `Paid`
- [x] Worker views wage summary and earnings

---

## 6. All API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/worker` | Register new worker | No |
| `POST` | `/api/auth/register/contractor` | Register new contractor | No |
| `POST` | `/api/auth/login` | Login worker or contractor | No |
| `GET` | `/api/auth/me` | Get current logged-in user | Yes (Any) |

### Worker APIs (`/api/workers`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/workers/profile` | Get worker profile | Worker |
| `PUT` | `/api/workers/profile` | Update worker profile | Worker |
| `GET` | `/api/workers/assigned-jobs` | View assigned/applied jobs | Worker |
| `GET` | `/api/workers/work-history` | View completed work history | Worker |
| `PUT` | `/api/workers/assignments/:id/accept` | Accept assigned job | Worker |
| `PUT` | `/api/workers/assignments/:id/status` | Update work status (`In Progress`, `Completed`) | Worker |
| `GET` | `/api/workers/wages` | View wage earnings & pending summary | Worker |
| `GET` | `/api/workers/payments` | View payment records | Worker |

### Contractor APIs (`/api/contractors`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/contractors/profile` | Get contractor profile | Contractor |
| `PUT` | `/api/contractors/profile` | Update contractor profile | Contractor |
| `GET` | `/api/contractors/jobs` | Get contractor's posted jobs | Contractor |
| `GET` | `/api/contractors/assignments` | View worker applicants / assigned workers | Contractor |
| `POST` | `/api/contractors/assign` | Directly assign a worker to a job | Contractor |
| `PUT` | `/api/contractors/assignments/:id/status` | Update assignment (`Accepted`, `Rejected`, `Completed`) | Contractor |
| `PUT` | `/api/contractors/payments/:id/status` | Update payment status (`Pending`, `Paid`) | Contractor |

### Jobs APIs (`/api/jobs`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/jobs` | Public job feed (filters: `?category=...&minWage=...&search=...`) | No |
| `GET` | `/api/jobs/:id` | Get job details by ID | No |
| `POST` | `/api/jobs` | Post new job requirement | Contractor |
| `PUT` | `/api/jobs/:id` | Update job requirement | Contractor |
| `POST` | `/api/jobs/:id/apply` | Apply for a job | Worker |

### Assignments & Payments (`/api/assignments`, `/api/payments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/assignments/:id` | Get assignment details | Worker/Contractor |
| `PUT` | `/api/assignments/:id/status` | Update assignment status | Worker/Contractor |
| `PUT` | `/api/assignments/:id/work-status` | Update work status | Worker/Contractor |
| `GET` | `/api/payments` | Get payment records | Worker/Contractor |
| `POST` | `/api/payments` | Create payment record | Contractor |
| `PUT` | `/api/payments/:id/status` | Update payment status | Contractor |

---

## 7. Example Requests and Responses

### 1. Worker Registration
**Request**: `POST /api/auth/register/worker`
```json
{
  "name": "Ramesh Kumar",
  "phone": "9876012345",
  "trade": "Masonry",
  "dailyWage": 850,
  "experience": "8+ Years",
  "location": "Sector 62, Noida, UP",
  "password": "1234"
}
```
**Response** (HTTP 201):
```json
{
  "success": true,
  "message": "Worker registered successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "w-1",
    "name": "Ramesh Kumar",
    "phone": "9876012345",
    "trade": "Masonry",
    "daily_wage": 850,
    "experience": "8+ Years",
    "location": "Sector 62, Noida, UP",
    "role": "worker"
  }
}
```

### 2. Login
**Request**: `POST /api/auth/login`
```json
{
  "identifier": "9876012345",
  "password": "1234",
  "role": "worker"
}
```
**Response** (HTTP 200):
```json
{
  "success": true,
  "message": "Welcome back, Ramesh Kumar!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "w-1",
    "name": "Ramesh Kumar",
    "phone": "9876012345",
    "trade": "Masonry",
    "role": "worker"
  }
}
```

### 3. Create Job (Contractor)
**Request**: `POST /api/jobs`  
**Header**: `Authorization: Bearer <contractor_token>`
```json
{
  "title": "Expert Mason Needed for Boundary Wall",
  "category": "Masonry",
  "workersNeeded": 3,
  "dailyWage": 850,
  "duration": "4 Days",
  "startDate": "Tomorrow, 8:00 AM",
  "location": "Sector 62, Noida, UP",
  "description": "Need 3 skilled masons to construct a 6-foot brick wall.",
  "urgent": true
}
```
**Response** (HTTP 201):
```json
{
  "success": true,
  "message": "Job requirement published successfully!",
  "job": {
    "id": "job-101",
    "contractor_id": "c-1",
    "title": "Expert Mason Needed for Boundary Wall",
    "category": "Masonry",
    "daily_wage": 850,
    "status": "Open"
  }
}
```

### 4. Contractor Accepts Worker
**Request**: `PUT /api/contractors/assignments/app-1/status`  
**Header**: `Authorization: Bearer <contractor_token>`
```json
{
  "status": "Accepted"
}
```
**Response** (HTTP 200):
```json
{
  "success": true,
  "message": "Worker status updated to 'Accepted' successfully!",
  "assignment": {
    "id": "app-1",
    "assignment_status": "Accepted",
    "work_status": "Accepted"
  }
}
```

### 5. Worker Views Wage Summary
**Request**: `GET /api/workers/wages`  
**Header**: `Authorization: Bearer <worker_token>`  
**Response** (HTTP 200):
```json
{
  "success": true,
  "summary": {
    "totalEarned": 850,
    "pendingAmount": 0,
    "completedJobsCount": 1,
    "activeJobsCount": 0
  }
}
```

---

## 8. Setting up Supabase Database

1. Open your Supabase Project Dashboard.
2. Navigate to the **SQL Editor**.
3. Open `backend/schema.sql`, paste the contents, and click **Run**.
4. Copy your **Project URL** and **anon public key** from Supabase Settings &rarr; API.
5. Add them to `backend/.env`:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
6. Restart the backend server (`npm start`). The backend will log:
   ```
   ✓ Connected to Supabase at: https://xxxxxxxxxxxx.supabase.co
   ```

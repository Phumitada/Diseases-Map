# National Health Portal — Disease Surveillance System

> ระบบเฝ้าระวังและรายงานสถานการณ์โรคแบบ Real-time สำหรับโรงพยาบาลทั่วประเทศไทย  
> พัฒนาด้วย Full-Stack TypeScript บน PostgreSQL และ deploy บน Railway + Vercel

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6+-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | https://your-app.vercel.app |
| **Backend API** | https://your-api.railway.app |

**Demo Account**
```
Username: admin_siriraj
Password: admin123
```

---

## Features

| หน้า | URL | คำอธิบาย | Access |
|------|-----|----------|--------|
| แผนที่โรคระบาด | `/` | Heatmap แสดงสถานการณ์โรครายจังหวัดทั่วประเทศ | Public |
| ข้อมูลรายจังหวัด | `/provinces` | ตารางสถิติโรคพร้อม filter และ pagination | Public |
| ประวัติการรายงาน | `/statistics` | รายงานผู้ป่วยล่าสุด 50 รายการ | Public |
| โรงพยาบาลเครือข่าย | `/hospitals` | รายชื่อโรงพยาบาลทั่วประเทศ | 🔒 Login |
| รายงานผู้ป่วย | `/reporting` | ฟอร์มส่งรายงานโรคสำหรับบุคลากร | 🔒 Login |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | UI และ Client-side Logic |
| **Styling** | Tailwind CSS + Lucide Icons | Medical Green Design System |
| **State** | Zustand | Auth State + JWT Token Management |
| **Map** | react-simple-maps | Geographic Heatmap Visualization |
| **HTTP** | Axios + Interceptors | Auto Token Refresh |
| **Backend** | Node.js + Express + TypeScript | REST API |
| **Auth** | JWT (Access + Refresh Token) + bcrypt | Stateless Authentication |
| **Database** | PostgreSQL 16 | Single Source of Truth |
| **ORM** | Prisma 6 | Type-safe Database Access |
| **Cache** | Redis | Refresh Token Storage |
| **Deploy** | Railway (API + DB) + Vercel (Frontend) | Production Infrastructure |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Client (React + Vite)               │
│                  Vercel CDN                      │
└────────────────────┬────────────────────────────┘
                     │ HTTPS / REST API
                     ▼
┌─────────────────────────────────────────────────┐
│             Express API Server                   │
│                 Railway                          │
│                                                  │
│  /api/auth          /api/report                  │
│  /api/hospital      /api/province                │
│  /api/disease       /api/dataProvince            │
│                                                  │
│  Middleware: JWT Auth → Role Guard → Controller  │
└──────────────┬──────────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌────────────┐   ┌─────────────┐
│ PostgreSQL │   │    Redis     │
│  Railway   │   │   Railway    │
│            │   │              │
│ Province   │   │ Refresh      │
│ Hospital   │   │ Tokens       │
│ Disease    │   └─────────────┘
│ User       │
│ Report     │
└────────────┘
```

### Database Schema

```
Province ──< Hospital ──< User
                │
                └──< Report >── Disease
```

| Table | Records | Description |
|-------|---------|-------------|
| Province | 77 | จังหวัดทั่วประเทศไทย |
| Hospital | 77+ | โรงพยาบาลแต่ละจังหวัด |
| Disease | 13 | โรคพร้อม ICD-10 Code |
| User | 12+ | บุคลากรโรงพยาบาล |
| Report | 5,000+ | รายงานผู้ป่วย |

---

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- Redis
- npm

### Installation

```bash
# Clone
git clone <repository-url>
cd diseases-map

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment Variables

สร้างไฟล์ `server/.env`

```env
DATABASE_URL="postgresql://user:password@localhost:5432/diseases_map"
REDIS_URL="redis://localhost:6379"
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
PORT=5207
```

สร้างไฟล์ `client/.env`

```env
VITE_API_URL=http://localhost:5207/api
```

### Database Setup

```bash
cd server

# Run migrations
npx prisma migrate dev

# Seed initial data (provinces, hospitals, diseases, users, 5000 reports)
npx prisma db seed
```

### Start Development Servers

```bash
# Backend (port 5207)
cd server && npm run dev

# Frontend (port 5173)
cd client && npm run dev
```

เปิด http://localhost:5173

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | เข้าสู่ระบบ รับ access + refresh token | — |
| `POST` | `/api/auth/register` | สมัครสมาชิก | — |
| `POST` | `/api/auth/refresh` | ต่ออายุ access token | — |
| `POST` | `/api/auth/logout` | ออกจากระบบ ลบ refresh token | 🔒 |

### Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/report/recent` | รายงานล่าสุด (limit query param) | — |
| `POST` | `/api/report` | ส่งรายงานผู้ป่วยใหม่ | 🔒 |

### Province Data (Map & Dashboard)

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|-------------|
| `GET` | `/api/dataProvince` | สถิติโรคแยกจังหวัด | `page`, `limit`, `order`, `risk` |
| `GET` | `/api/dataProvince/count` | จำนวนรวมแยกตาม type | `type` (province/disease/total) |
| `GET` | `/api/dataProvince/map` | ข้อมูลสำหรับ heatmap | `risk`, `order`, `disease` |

### Hospitals & Provinces

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/hospital` | รายชื่อโรงพยาบาล | 🔒 |
| `GET` | `/api/provinces` | รายชื่อจังหวัดทั้งหมด | — |

---

## 📂 Project Structure

```
diseases-map/
│
├── client/                     # React Frontend
│   └── src/
│       ├── api/                # Axios client + interceptors
│       ├── components/         # Shared components (Map, Navbar)
│       ├── features/
│       │   ├── map/            # Heatmap dashboard
│       │   ├── dash_txt/       # Province statistics table
│       │   ├── hospitals/      # Hospital directory
│       │   ├── statistics/     # Recent reports
│       │   └── login/
│       ├── routes/             # React Router
│       └── stores/             # Zustand auth store
│
├── server/                     # Express Backend
│   ├── controllers/            # Request handlers
│   ├── routes/                 # API routes
│   ├── middleware/             # JWT auth middleware
│   ├── prisma/                 # Schema + Migrations
│   └── seeds/                  # Database seed scripts
│
└── shared/                     # Shared TypeScript types
    └── types/schema/
```

---

## Authentication Flow

```
Login → Access Token (15m) + Refresh Token (7d, stored in Redis)
         │
         ▼
Request with Bearer Token
         │
    Token expired?
    ├── No  → proceed
    └── Yes → auto refresh via interceptor → retry request
                    │
               Refresh expired?
               └── redirect to login
```

---

## Data Model Highlights

**Report aggregation** — Province heatmap คำนวณจาก groupBy hospital → join province แบบ in-memory เพื่อรองรับ filter risk level และ disease filter แบบ dynamic

**Risk Classification**
- 🟢 ปกติ: 0–500 ราย
- 🟡 เฝ้าระวัง: 501–3,000 ราย  
- 🔴 ฉุกเฉิน: 3,000+ ราย
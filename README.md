# PropCRM Pro — Real Estate CRM Platform

A comprehensive, Sell.Do-inspired real estate CRM covering the complete journey from marketing/lead capture to post-sales possession.

---

## 📁 Project Structure

```
real-estate-crm/
├── frontend/                     # React 19 + Vite Frontend
│   ├── public/                   # Static assets & icons
│   ├── src/
│   │   ├── components/           # Layout, Topbar, Sidebar, UI widgets
│   │   ├── context/              # AuthContext & Session management
│   │   ├── pages/                # All 19 CRM Module Views
│   │   │   ├── activities/       # Tasks, Follow-ups, Calls
│   │   │   ├── auth/             # Login & Authentication
│   │   │   ├── automation/       # Trigger-Condition-Action SLA Engine
│   │   │   ├── booking/          # 3-step Digital Booking Application
│   │   │   ├── channelpartners/  # CP Broker Directory & Commission
│   │   │   ├── communication/    # Cloud Dialer, WhatsApp & Email
│   │   │   ├── customer/         # Buyer Self-Service Portal
│   │   │   ├── dashboard/        # Executive KPIs & Lead Funnel
│   │   │   ├── inventory/        # Interactive Tower/Floor Matrix
│   │   │   ├── leads/            # All Leads (Table + Kanban + Drawer)
│   │   │   ├── marketing/        # Meta/Google Ads, Scoring & Drips
│   │   │   ├── negotiations/     # Discount Approval Hierarchy
│   │   │   ├── payments/         # Milestone Demands & Collections
│   │   │   ├── pipeline/         # Sales Pipeline Stages
│   │   │   ├── pricing/          # Dynamic Cost Sheet Generator
│   │   │   ├── projects/         # Residential & Commercial Projects
│   │   │   ├── reports/          # Executive BI Analytics
│   │   │   ├── settings/         # API Gateways & Company Profile
│   │   │   ├── sitevisits/       # Site Visit Workflow (Check-in/out)
│   │   │   └── users/            # RBAC Matrix & Org Hierarchy
│   │   ├── services/             # Axios API Client
│   │   └── utils/                # Formatters & Constants
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Node.js + Express + MongoDB Backend
│   ├── controllers/              # 13 REST API Controllers
│   ├── db/                       # MongoDB Connection & Seed Scripts
│   ├── middleware/               # JWT Auth & Error Handlers
│   ├── models/                   # 10 Mongoose Data Models
│   ├── routes/                   # Modular Express Route Definitions
│   ├── package.json
│   ├── index.js                  # Server Entry Point (Port 3001)
│   └── .env                      # Environment Variables
│
└── package.json                  # Root runner script
```

---

## 🚀 Quick Start Guide

### 1. Run the Backend API
```bash
cd backend
npm install
node db/seed.js   # Seed initial demo data
node index.js     # Starts server on http://localhost:3001
```

### 2. Run the Frontend Web App
```bash
cd frontend
npm install
npm run dev       # Starts Vite on http://localhost:5174
```

### 🔑 Demo Login Accounts
- **Super Admin**: `admin@crm.com` / `Admin@123`
- **Sales Head**: `sales.head@crm.com` / `Admin@123`
- **Sales Executive**: `sales1@crm.com` / `Admin@123`

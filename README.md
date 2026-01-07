<<<<<<< HEAD
# interior-demo
=======
# Artistic Engineers - Interior Design Management System

A full-stack PERN (PostgreSQL, Express, React, Node.js) application for managing interior design projects, teams, quotations, expenses, and more.

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure your database
npm run dev           # Development mode
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # Development mode at http://localhost:5173
```

## 📁 Project Structure

```
.
├── backend/              # Express API server
│   ├── api/             # Route handlers
│   ├── middleware/      # Error handling, auth, etc.
│   └── db.ts            # PostgreSQL connection
├── frontend/            # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # App state management
│   │   ├── api/         # API client functions
│   │   └── utils/       # Helper functions
└── Untitled.sql         # Database schema
```

## 🔧 Recent Fixes & Updates

### ✅ Latest Fix (December 31, 2024)
**Team Category Enum Fix**
- **Problem**: Production database was rejecting team member creation with error: `invalid input value for enum team_category_enum: "General"`
- **Solution**: Changed default team category from `'General'` to `'Other'` in `backend/api/teams.ts`
- **Status**: ✅ Fixed and ready for deployment

### Previous Fixes
1. ✅ Global error handling middleware
2. ✅ Zod validation error handling
3. ✅ Database constraint error handling
4. ✅ Frontend error utilities
5. ✅ Task validation fixes
6. ✅ Upload error handling

See [ERROR_FIXES_SUMMARY.md](./ERROR_FIXES_SUMMARY.md) for complete details.

## 📊 Features

- **Project Management**: Track projects, quotations, and conversions
- **Team Management**: Manage team members with skills and categories
- **Expense Tracking**: Record and categorize project expenses
- **Supplier Management**: Track suppliers and payments
- **Task Management**: Assign and track tasks
- **Lead Management**: Track leads from Instagram and other sources
- **Quotation System**: Create, edit, and convert quotations to projects
- **Trash & Recovery**: Soft-delete with 30-day retention

## 🗄️ Database

PostgreSQL with the following main tables:
- `projects` - Project information
- `teams` - Team categories (Carpentry, Electrical, etc.)
- `team_members` - Individual team members
- `quotations` & `quotation_items` - Quotation management
- `expenses` & `expense_items` - Expense tracking
- `suppliers` & `supplier_payments` - Supplier management
- `tasks` - Task assignments
- `leads` - Lead tracking

### Valid Team Categories (Enum)
- `'Carpentry'`
- `'Electrical'`
- `'Light Fitting'`
- `'Painting'`
- `'Plumbing'`
- `'Civil'`
- `'Other'`

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=arteng
PGUSER=postgres
PGPASSWORD=postgres
PGSSL=false
APP_ORIGIN=http://localhost:5173
TRASH_RETENTION_DAYS=30
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Backend
1. Build: `npm run build`
2. Start: `npm start`
3. Or use PM2: `pm2 start dist/index.js --name arteng-backend`

### Frontend
1. Build: `npm run build`
2. Serve the `dist/` folder with any static server

### Database Migration
If deploying to production and need to fix existing team data:
```bash
psql -U your_user -d your_database -f backend/fix_team_category.sql
```

## 📝 API Endpoints

Base URL: `http://localhost:3000/api`

- **Health**: `GET /health`
- **Teams**: `GET|POST|PUT|DELETE /teams`
- **Projects**: `GET|POST|PUT|DELETE /projects`
- **Quotations**: `GET|POST|PUT|DELETE /quotations`
- **Expenses**: `GET|POST|PUT|DELETE /expenses`
- **Suppliers**: `GET|POST|PUT|DELETE /suppliers`
- **Tasks**: `GET|POST|PUT|DELETE /tasks`
- **Leads**: `GET|POST|PUT|DELETE /leads`

See individual route files in `backend/api/` for detailed endpoints.

## 🐛 Known Issues & Solutions

### Issue: "invalid input value for enum team_category_enum: 'General'"
**Status**: ✅ FIXED  
**Solution**: Updated `backend/api/teams.ts` to use `'Other'` instead of `'General'`  
**Action Required**: Restart backend server or redeploy

## 📞 Support

For issues or questions, refer to:
- [ERROR_FIXES_SUMMARY.md](./ERROR_FIXES_SUMMARY.md) - Complete error handling documentation
- Backend README: [backend/README.md](./backend/README.md)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16+
- **Validation**: Zod
- **Authentication**: JWT (if implemented)

---

**Last Updated**: December 31, 2024  
**Version**: 4.0 (November 26 Meet Changes)
>>>>>>> 2accffd (Backend fixes, analytics API, dashboard update)
# Interior-crm-demo-users
# Interior-crm-demo-users

# Pashuthalam - Medical Shop Management Portal

## Project Structure

```
medical1/
├── backend/          # Flask API server
│   ├── app.py        # Main API application (JWT auth, all endpoints under /api/)
│   ├── db.py         # Database operations (raw SQL with PyMySQL)
│   ├── requirements.txt
│   ├── database_schema.sql
│   ├── create_tables.sql
│   └── fix_database_column.sql
│
├── frontend/         # React SPA (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── logo.png
│   │   └── landing_Medicine.png
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   └── api.js           # API service layer
│       ├── context/
│       │   └── AuthContext.jsx   # Auth state management
│       ├── components/
│       │   ├── Layout.jsx        # Navbar + Bottom Nav + Outlet
│       │   └── Layout.css
│       └── pages/
│           ├── Login.jsx         # Landing + Login/Signup modals
│           ├── Dashboard.jsx     # Stats, Quick Search, Recent Activity
│           ├── Search.jsx        # Search unclaimed recommendations
│           ├── MyClaims.jsx      # View & filter claimed recommendations
│           ├── Profile.jsx       # View & edit shop profile
│           └── Reports.jsx       # Charts, stats, CSV export
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env file with database credentials:
# DB_USERNAME=root
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=AgriSafe
# SECRET_KEY=your-secret-key

python app.py
# Runs on http://localhost:5001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173 (proxies /api/* to backend)
```

### Production Build

```bash
cd frontend
npm run build
# Output in frontend/dist/ — serve with any static file server
```

## API Endpoints

All endpoints are prefixed with `/api/`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with mobile_no + password |
| POST | `/api/auth/signup` | No | Register new medical shop |
| GET | `/api/auth/verify` | Yes | Verify JWT token |
| GET | `/api/shop/profile` | Yes | Get shop profile |
| PUT | `/api/shop/profile` | Yes | Update shop profile |
| GET | `/api/shop/statistics` | Yes | Get claim statistics |
| GET | `/api/shop/claimed-recommendations` | Yes | Get claimed recommendations (paginated) |
| GET | `/api/recommendations/:id` | Yes | Get recommendation details |
| POST | `/api/recommendations/:id/claim` | Yes | Claim a recommendation |
| GET | `/api/recommendations/search` | Yes | Search unclaimed recommendations |

## Authentication

Uses JWT Bearer tokens. After login, include the token in all requests:
```
Authorization: Bearer <token>
```

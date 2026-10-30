# FarmProfit - Premium Agribusiness Intelligence

A premium dark-themed agribusiness dashboard connecting farmers and buyers. Built with vanilla Node.js backend and static frontend.

## Quick Start

### Prerequisites
- Node.js installed
- Python (for local frontend server, optional)

### Backend (Port 5000)
```powershell
cd "C:\Users\arshr\OneDrive\Desktop\FINE Y"
node server.js
```
Backend runs at `http://localhost:5000`

### Frontend (Port 5500 - optional, backend serves static files too)
```powershell
python -m http.server 5500
```
Access at `http://localhost:5000/index.html` (backend serves static files)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/demo-login` | Demo login (farmer/buyer) |
| GET | `/api/crops` | List crops (query: status, farmerId) |
| POST | `/api/crops` | Create crop listing (farmer only) |
| GET | `/api/crops/:id` | Get single crop |
| GET | `/api/crops/:id/matching-buyers` | Get matching buyers |
| GET | `/api/buyers` | List buyers |
| POST | `/api/buyers/requirements` | Create buyer requirement |
| POST | `/api/calculate-options` | Calculate profit options |
| POST | `/api/offers` | Create offer (buyer only) |
| GET | `/api/offers` | Get offers (farmer only) |
| POST | `/api/offers/:id/accept` | Accept offer (farmer only) |
| POST | `/api/orders/:id/stage` | Update order stage |
| GET | `/api/orders` | Get orders |
| GET | `/api/orders/:id` | Get single order |
| POST | `/api/sync` | Offline sync |
| GET | `/api/sync/status` | Sync status |
| POST | `/api/messages` | Send message (buyer <-> farmer) |
| GET | `/api/messages` | Get messages (query: otherUserId) |
| POST | `/api/messages/:id/read` | Mark message as read |
| GET | `/api/messages/conversations` | Get conversation list |

## Project Structure

```
server.js          # Node.js backend (HTTP server + API + static file serving)
api/index.js       # Vercel serverless adapter (same logic as server.js)
vercel.json        # Vercel deployment configuration
db.json            # Local JSON database (auto-created)
index.html         # Home page (role selector)
index.css          # Main design system
index.js           # Home page logic
messages.html      # Messaging page (buyer <-> farmer)
messages.css       # Messaging styles
messages.js        # Messaging logic
welcome.*          # Welcome screen
farmer-dashboard.* # Farmer dashboard
add-crop.*         # Add crop listing
buyer-option.*     # Buyer options / matching
profit-comparison.* # Profit comparison
buyer-detail.*     # Buyer detail view
storage-transport.* # Storage & transport options
order-tracking.*   # Order tracking (7 stages)
buyer-dashboard.*  # Buyer dashboard
admin-dashboard.*  # Admin dashboard
supabase_schema.sql # Supabase database schema
uploads/           # File upload directory
.env               # Environment variables
.env.example       # Environment variable template
README.md          # This file
```

## Vercel Deployment

### Prerequisites
- GitHub account
- Vercel account

### Steps
1. Push all files to a GitHub repository
2. Log in to Vercel and click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects `vercel.json` and deploys
5. Your site will be live at `https://your-project.vercel.app`

### Important Notes
- **API URLs are relative** (`/api`) — works on both localhost and Vercel
- **`db.json` is read-only on Vercel** — data resets on each function invocation (suitable for demo; use Supabase/PostgreSQL for production persistence)
- **Local development**: Run `node server.js` and open `http://localhost:5000/index.html`

## Demo Login

Click **Farmer** or **Buyer** on the home page → **Demo Login**.

| Role | Email | Password |
|------|-------|----------|
| Farmer | demo@farmprofit.com | demo123 |
| Buyer | buyer@farmprofit.com | demo123 |
| Admin | admin@farmprofit.com | admin123 |

## Messaging System

Farmers and buyers can now communicate directly:

1. Log in as Farmer or Buyer
2. Click **Messages** in the navigation
3. Select a conversation or start a new one
4. Send and receive messages in real-time (5-second polling)
5. Unread messages show a badge counter

## License
MIT
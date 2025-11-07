# Water Pump Project V2.0

## 🚀 Project Overview
This project is an advanced water pump monitoring and control system built with React and Firebase. It provides real-time monitoring of water meters, user management, and role-based access control for different user types (admin and regular users).

---

## 📂 Project Structure
```
water-pump-project-V2.0/
├── backend/                 # Node.js + Express + Firebase API
│   ├── config/             # Database and Firebase configurations
│   ├── controllers/        # Business logic
│   ├── middleware/         # Auth middleware
│   ├── models/            # Data models
│   └── routes/            # API routes
└── frontend/              # React + Vite application
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── pages/        # Main application pages
    │   └── services/     # API and authentication services
    └── public/           # Static assets
```

- **backend/**: Contains server-side logic, REST endpoints (e.g., `/api/water`, `/api/auth`), controllers, routes.
- **frontend/**: Contains React UI, pages like Dashboard, HouseholdsPage, WaterMeterReadings, centralized API service, authentication, etc.
- **.gitignore**: Standard ignores for node_modules, build outputs, environment files.

---

## 🛠️ Key Features
- **Real-time Monitoring**
  - Live water meter readings (flow rate, pressure, consumption)
  - Dynamic charts showing 5-minute historical data
  - Automatic data refresh
- **Role-based Access Control**
  - Admin dashboard with enhanced controls
  - Regular user view with basic monitoring
  - Area-specific data access for admins
- **Advanced Dashboard**
  - Interactive data visualization
  - Area-wise meter readings for admins
  - Cut-off controls (admin only)
- **Navigation Features**
  - Areas management
  - Users overview
  - Billing information
  - Alerts system
  - Settings configuration

## 🧱 Technologies Used
- **Frontend**
  - React 18+ with Vite
  - Tailwind CSS for styling
  - Recharts for data visualization
  - React Router v6
- **Backend**
  - Node.js with Express
  - Firebase Realtime Database
  - Firebase Authentication
- **State Management**
  - React Hooks
  - Context API
- **Real-time Updates**
  - Firebase Realtime Database listeners
  - WebSocket connections

---

## 📝 Getting Started

### Prerequisites
- Node.js >= 14
- npm or yarn
- Firebase account and project setup
- Environment variables for Firebase configuration

### Setup & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/maneeshaYasinth/water-pump-project-V2.0.git
   cd water-pump-project-V2.0
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Configure your Firebase credentials in config/firebase.js
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Configure your Firebase credentials in src/firebase.js
   npm run dev
   ```

4. Access the application at `http://localhost:5173`

## 🧪 Usage
- Register a new user via the frontend.
- Log in to obtain a token.
- Navigate to the “Water Meter Readings” page to view live data (consumption, flow rate, monthly units, pressure, total units).
- Use the “Households” page to view/manage additional entities (future extension).
- The frontend will poll the backend every few seconds (e.g., 5 seconds) to maintain near-real-time updates.

## 🔧 Notes & Future Improvements
- Ensure the backend endpoint `/api/water` is accessible and correctly configured.
- The Axios instance in the frontend attaches the token automatically for auth routes.
- Potential enhancements:
    - Dashboard graphs of historical water usage.
    - Alerts when pressure or flow rate exceed thresholds.
    - Push notifications or email alerts for anomalies.
    - Containerization (Docker) + CI/CD pipeline (GitHub Actions) for production deployment.
    - Multi-user roles with different permissions (admin, viewer).
    - Offline mode / caching for intermittent connectivity.

## 🧭 Project Roadmap
- Implement historical data storage & retrieval
- Add pump control (turn on/off remotely)
- Role-based authentication & authorization
- Deploy to cloud with environment-specific config
- Add unit/integration tests for both frontend and backend

## 📄 License
(If applicable, add license info here)
MIT License – see LICENSE file for details.

## 👤 Author
Maneesha Yasinth – [GitHub Profile](https://github.com/maneeshaYasinth)
Feel free to open issues or contribute enhancements.

---

Feel free to **modify**, **add screenshots**, or **link to a live demo** if you have one.
Would you like me to include *badges* (build passing, coverage, license) or *screenshots* in the README as well?
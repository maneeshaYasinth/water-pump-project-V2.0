# Water Pump Project V2.0

## 🚀 Project Overview
This project is a monitoring and control system for water pumps, built with a **MERN-stack** frontend and backend. The system allows users to view real-time readings from a smart water meter (daily consumption, flow rate, monthly units, pressure, total units) and manage associated households/pumps.

---

## 📂 Project Structure
water-pump-project-V2.0/
├── backend/ ← Node.js + Express API
├── frontend/ ← React-based UI
└── .gitignore

- **backend/**: Contains server-side logic, REST endpoints (e.g., `/api/water`, `/api/auth`), controllers, routes.
- **frontend/**: Contains React UI, pages like Dashboard, HouseholdsPage, WaterMeterReadings, centralized API service, authentication, etc.
- **.gitignore**: Standard ignores for node_modules, build outputs, environment files.

---

## 🛠️ Key Features
- User authentication (register/login) via `/api/auth`.
- Authenticated route for live water meter readings from `/api/water`.
- Automatic polling (e.g., every 5 seconds) to refresh live data in the UI.
- Dashboard and households management (for future expansion).
- Clean separation between service layer (API logic) and UI components.
- Modular file structure to support expansion (e.g., pump control, alerts, CI/CD).

---

## 🧱 Technologies Used
- **Frontend**: React, React Router (v6+), Axios, Tailwind CSS (for UI styling)
- **Backend**: Node.js, Express.js, (optionally) MongoDB or another data store
- **HTTP Client**: Axios instance with token interceptor for authenticated requests
- **Version Control**: Git & GitHub repository

---

## 📝 Getting Started

### Prerequisites
- Node >= 14 or similar
- npm or yarn
- (Optional) MongoDB or your chosen database
- Environment variables (e.g., `JWT_SECRET`, DB connection string)

### Setup & Run

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/maneeshaYasinth/water-pump-project-V2.0.git](https://github.com/maneeshaYasinth/water-pump-project-V2.0.git)
    cd water-pump-project-V2.0
    ```
2.  **Install dependencies for backend**
    ```bash
    cd backend
    npm install
    ```
3.  **Start backend server**
    ```bash
    npm run dev
    # or 
    node server.js
    ```
4.  **Install dependencies for frontend**
    ```bash
    cd ../frontend
    npm install
    ```
5.  **Start frontend development server**
    ```bash
    npm run start
    ```
6.  Visit `http://localhost:3000` (or your configured port) to access the app.

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
# Time Tracker & Productivity Analytics

A full-stack Chrome Extension designed to monitor web usage, categorize domains into productivity levels, and visualize data through a real-time analytics dashboard.

## 🚀 Features

### Precise Time Tracking

Automatically detects active browser tabs and calculates time spent on specific domains using high-resolution timestamps.

### Intelligent Categorization

Automatically sorts website usage into three distinct categories based on domain keywords:

* **Productive**: GitHub, StackOverflow, Localhost
* **Unproductive**: YouTube, Facebook, Reddit, Instagram
* **Neutral**: All other domains

### Analytics Dashboard

A modern **Glassmorphism** popup UI featuring:

* **Real-time Totals**: Instant summary of daily/weekly time spent.
* **Doughnut Charts**: Visual productivity ratios powered by **Chart.js**, with data automatically converted from seconds to minutes for readability.
* **Leaderboard**: A "Most Used Sites" ranking with automated duration formatting (H/M).

### Background Synchronization

* **Auto-Sync**: Pushes local data to the database every 5 minutes.
* **Data Safety**: Clears local cache only after a successful server confirmation to prevent data loss.

---

## 🛠️ Tech Stack

### Extension (Frontend)

* **Vanilla JavaScript** — Background service worker and popup logic.
* **Chart.js** — Data visualization and minute-based conversion.
* **Chrome Extension API** — `tabs`, `storage`, and `alarms` management.
* **CSS3** — Advanced Glassmorphism and Backdrop-filter styling.

### Backend

* **Node.js & Express** — RESTful API for tracking and reporting.
* **MongoDB** — Persistent storage for user tracking data.
* **Mongoose** — Schema modeling with atomic `$inc` updates and domain-key sanitization.

---

## 📂 Project Structure

```
TIME TRACKER/
├── backend/               # Node.js Backend Application
│   ├── node_modules/      # Server-side dependencies
│   ├── package-lock.json  # Dependency lockfile
│   ├── package.json       # Backend configuration & scripts
│   └── server.js          # Express API & MongoDB Connection
├── extension/             # Chrome Extension Files
│   ├── background.js      # Time tracking & Sync logic
│   ├── chart.js           # Chart.js library file
│   ├── manifest.json      # Extension configuration (MV3)
│   ├── popup.html         # Analytics Dashboard UI
│   └── popup.js           # UI logic & Fetch implementation
├── LICENSE.gnumeric       # License information
└── README.md              # Project documentation

```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/track` | Sanitizes domain names and increments time spent in the DB. |
| `GET` | `/api/report/:userId` | Retrieves aggregated productivity stats and site rankings. |

---

## 📦 Installation & Setup

### 1️⃣ Start the Backend

```bash
cd backend
npm install
node server.js

```

*Note: Ensure your MongoDB service is running locally on `mongodb://127.0.0.1:27017`.*

### 2️⃣ Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** using the toggle in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder from your project directory.

---

## 📄 License

This project is open-source software and is disseminated under the stipulations of the MIT License.

Developed by Sravan-09
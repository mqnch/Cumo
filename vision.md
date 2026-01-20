# Project Vision: Cumo

## 1. Project Overview
Cumo is a high-performance, "always-on" desktop utility application. It functions as a **global quick-capture bar** for calendar events and reminders, mimicking the UX of Spotlight Search or the ChatGPT shortcut.

**Core Value:** Zero-latency scheduling.
**Interaction Model:**
1. User triggers global hotkey (e.g., `Cmd + /`).
2. A minimalist search bar appears (frameless, transparent, floating).
3. User inputs text in **Command Mode** (rigid syntax) or **Natural Language Mode** (AI parsing).
4. Data is processed locally and pushed asynchronously to calendar providers.

---

## 2. Tech Stack & Architecture

### **Application Shell: Electron**
* **Role:** OS integration, window management, global shortcuts (`globalShortcut`), and system tray.
* **Why:** Mature ecosystem for "headless" background apps; ability to spawn and manage child processes (Python).

### **Frontend: React + Vite**
* **Role:** The UI renderer.
* **Setup:** A lightweight Single Page Application (SPA) served by Vite within the Electron BrowserWindow.
* **Key Libs:** * `TailwindCSS` (Styling)
    * `Framer Motion` (Animations)
    * `Axios` (API calls to Flask)

### **Backend: Python (Flask)**
* **Role:** The application logic and NLP engine.
* **Execution:** Spun up as a child process (`spawn`) by Electron on app launch.
* **Responsibilities:**
    1. Hosting the NLP Model.
    2. Parsing natural language to structured JSON.
    3. Handling OAuth flows (Google/iCal).

### **Task Queue: Huey (SQLite)**
* **Library:** `huey` (specifically `SqliteHuey`).
* **Why:** Zero-dependency background tasks. Uses a local `.db` file as the broker (no Redis required).
* **Role:** * Handles "fire and forget" requests to Google/Apple Calendars.
    * **Resilience:** If the user is offline, tasks persist in the local SQLite db and retry automatically when the app restarts/reconnects.

---

## 3. Architecture & Data Flow

### **The "Sidecar" Pattern**
The application runs as a hybrid Node.js/Python environment.

1.  **Electron Main Process (Node.js)**
    * **Startup:** Spawns the `python app.py` process (Flask + Huey Worker).
    * **Lifecycle:** Manages the Python process (kills it when the app quits).
    * **Window:** Manages the transparent `BrowserWindow`.

2.  **Frontend (React/Vite)**
    * **Typing:** Sends text to Flask (`POST /parse`) for real-time preview.
    * **Submitting:** Sends payload to Flask (`POST /schedule`).

3.  **Backend (Flask + Huey)**
    * **Flask:** Receives the `/schedule` request.
    * **Huey:** Immediately enqueues a background task (`push_to_calendar_task`) and returns `200 OK` to the UI.
    * **Worker:** The background thread processes the queue, handles the API call, and updates the local status.

---

## 4. Functional Guidelines (Cursor AI Instructions)

### **A. UI/UX Rules**
* **Frameless Window:** The app must be a `transparent: true`, `frame: false` window.
* **Focus Logic:** * On `Global Hotkey`: Show window + Force focus input. 
    * On `Blur` (user clicks away): Hide window immediately (do not close/quit).
* **Spotlight Aesthetic:** Center-screen or top-third position. Large text input, minimal icons.

### **B. Input Parsing Logic**
* **Mode Detection:**
    * If input starts with `/` -> **Command Mode** (Client-side regex parsing).
    * Else -> **Natural Mode** (Send to Flask for parsing).
* **Command Syntax:** `/e` (Event), `/r` (Reminder).
    * Example: `/e tomorrow@2pm "Deep work session"`

### **C. Directory Structure Convention**
* `/src` -> Electron Main (`main.js`, `preload.js`) and Renderer (`/components`, `App.jsx`).
* `/backend` -> Python environment.
    * `app.py` (Flask entry).
    * `tasks.py` (Huey tasks & configuration).
    * `nlp.py` (Parser logic).
    * `cumo.db` (Huey SQLite file).

---

## 5. Development Checklist
1.  **Scaffold:** Initialize Electron + Vite project.
2.  **Python Spawn:** Write the Node.js logic to spawn the Flask server on a random free port (or fixed port) and pipe stdout.
3.  **Huey Setup:** Create `tasks.py` using `SqliteHuey` and ensure the worker thread is started alongside Flask.
4.  **IPC Bridge:** configure `preload.js` to allow the React frontend to minimize/hide the Electron window after a successful submission.
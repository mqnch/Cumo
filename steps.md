## Phase 1: The Electron Shell (The "Body")
- [ ] **Step 1.1:** Configure Electron Main Process.
    - Create `electron/main.js` (or `main.ts`).
    - Configure `BrowserWindow` to be `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`.
    - Set up the entry point in `package.json` to point to `electron/main.js`.
- [ ] **Step 1.2:** Implement Global Hotkey.
    - In `main.js`, use `globalShortcut.register('CommandOrControl+/', ...)` to toggle window visibility.
    - Ensure the window gains focus when shown and hides when blurred.
- [ ] **Step 1.3:** Setup IPC (Inter-Process Communication).
    - Create `electron/preload.js`.
    - Expose safe methods to the renderer (e.g., `window.electron.hideWindow()`, `window.electron.resizeWindow()`).

---

## Phase 2: The Python Backend (The "Brain")
- [ ] **Step 2.1:** Basic Flask Setup.
    - Create `backend/app.py`.
    - Create a basic route `/health` that returns `{"status": "ok"}`.
    - Enable CORS so the React frontend can talk to it.
- [ ] **Step 2.2:** Spawning Python from Node.
    - Update `electron/main.js` to spawn the Python process (`child_process.spawn`) on app launch.
    - Ensure the Python process is killed when the app quits.
    - **Critical:** Handle port assignment (hardcode port 5000 for dev, or pass a dynamic port via args).
- [ ] **Step 2.3:** Integrate the NLP Parser.
    - Create `backend/nlp.py`.
    - Move your existing parser logic here.
    - Create an endpoint `POST /parse` in `app.py` that accepts text and returns the JSON structure.

---

## Phase 3: The Task Queue (The "Muscle")
- [ ] **Step 3.1:** Configure Huey.
    - Create `backend/tasks.py`.
    - Initialize `SqliteHuey('cumo.db')`.
    - Define a dummy task `@huey.task()` that prints to the console to test the queue.
- [ ] **Step 3.2:** Run Huey Worker.
    - In `electron/main.js`, we likely need to spawn a *second* Python process (or use a Python script that runs both Flask and the Huey consumer). *Simpler approach for MVP: Use `huey.contrib.mini.MiniHuey` which runs in a thread, or spawn the worker via subprocess in `app.py`.*
    - *Decision:* Let's stick to `SqliteHuey` and spawn a separate worker process in `main.js` using the command `huey_consumer.py backend.tasks.huey`.

---

## Phase 4: Frontend UI (The "Face")
- [ ] **Step 4.1:** Clean up Vite.
    - Remove default React boilerplate.
    - Install TailwindCSS.
- [ ] **Step 4.2:** Build the Input Component.
    - Create a large, unstyled input field that takes up the whole window.
    - Add logic to detect "/" for Command Mode vs Natural Mode.
- [ ] **Step 4.3:** Live Preview.
    - Create a `useEffect` that debounces input.
    - On change, call `POST /parse` (if Natural Mode) and display the returned JSON in a "Ghost Card" below the input.

---

## Phase 5: Calendar Integration
- [ ] **Step 5.1:** Google Calendar OAuth.
    - In `backend/auth.py`, set up the `flow` to open a browser window for user permission.
    - Save `token.json` locally.
- [ ] **Step 5.2:** The "Push" Task.
    - In `backend/tasks.py`, write the actual logic to take the JSON event and POST it to the Google Calendar API.
- [ ] **Step 5.3:** Connect UI to Task.
    - On "Enter" key press in React -> `POST /schedule` to Flask.
    - Flask calls `push_to_calendar.schedule(data)`.

## Phase 6: Polish & Packaging
- [ ] **Step 6.1:** Error Handling.
    - Add a "Shake" animation in React if the backend returns an error.
- [ ] **Step 6.2:** Packaging.
    - Configure `electron-builder`.
    - Handle including the Python executable/environment in the final build (using PyInstaller or by bundling a portable python zip).
/* =============================================================
   Personal Dashboard — app.js
   All application logic lives in this single file.
   ============================================================= */

/* -------------------------------------------------------------
   1. Storage Module
   Thin wrapper around localStorage with JSON serialisation.
   ------------------------------------------------------------- */

const KEYS = {
  THEME:    'db_theme',     // 'dark' | 'light'
  NAME:     'db_name',      // string, max 50 chars
  TASKS:    'db_tasks',     // Task[]
  LINKS:    'db_links',     // LinkCard[]
  DURATION: 'db_duration',  // number (minutes, 1–90)
};

const Storage = {
  /**
   * Read a value from localStorage.
   * Returns `fallback` if the key is absent or the stored JSON is unparseable.
   *
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Write a value to localStorage as JSON.
   * Quota / security errors are caught and logged silently so the
   * UI is never blocked by a storage failure.
   *
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Quota exceeded or storage unavailable — log silently.
      console.warn('[Storage.set] Failed to persist key "' + key + '":', e);
    }
  },
};

/* -------------------------------------------------------------
   2. Theme Module
   Controls the data-theme attribute on <html> and syncs with
   localStorage. Implements Requirements 6.2 and 6.3.
   ------------------------------------------------------------- */

const Theme = {
  /**
   * Apply a theme by setting `data-theme` on <html>.
   *
   * @param {'dark'|'light'} value
   */
  apply(value) {
    document.documentElement.setAttribute('data-theme', value);
    // Sync the toggle button icon: sun when light, moon when dark.
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = value === 'light' ? '☀️' : '🌙';
    }
  },

  /**
   * Read the current theme, flip to the opposite, apply it,
   * and persist the new value to localStorage.
   */
  toggle() {
    const next = Theme.current() === 'dark' ? 'light' : 'dark';
    Theme.apply(next);
    Storage.set(KEYS.THEME, next);
  },

  /**
   * Return the value of the `data-theme` attribute currently
   * set on <html>.
   *
   * @returns {string|null}
   */
  current() {
    return document.documentElement.getAttribute('data-theme');
  },
};

/* -------------------------------------------------------------
   Theme toggle button — wire up the click listener.
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', Theme.toggle);
  }
});

/* -------------------------------------------------------------
   Name Modal wiring
   #user-name click  → Greeting.openModal()   (Req 2.7)
   #btn-name-submit  → Greeting.submitName()  (Req 2.8, 2.9, 2.10)
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  // The #user-name span is injected by Greeting.render(), so we use
  // event delegation on the parent #greeting-text element to handle
  // clicks even after re-renders replace the innerHTML.
  const greetingText = document.getElementById('greeting-text');
  if (greetingText) {
    greetingText.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'user-name') {
        Greeting.openModal();
      }
    });
  }

  const btnNameSubmit = document.getElementById('btn-name-submit');
  if (btnNameSubmit) {
    btnNameSubmit.addEventListener('click', function () {
      const nameInput = document.getElementById('name-input');
      const raw = nameInput ? nameInput.value : '';
      // submitName ignores empty strings, so only close when there is input.
      if (raw.trim() !== '') {
        Greeting.submitName(raw);
        Modal.close('modal-name');
      }
    });
  }
});

/* -------------------------------------------------------------
   3. Greeting Module (partial)
   Formats time/date and computes the time-of-day greeting.
   Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5.
   ------------------------------------------------------------- */

const Greeting = {
  /**
   * Format a Date as a zero-padded HH:MM string.
   * e.g. new Date(2025, 5, 16, 9, 5) → "09:05"
   *
   * @param {Date} date
   * @returns {string}  HH:MM
   */
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  },

  /**
   * Format a Date as a human-readable string containing the
   * full weekday name, day-of-month, full month name, and
   * four-digit year.
   * e.g. new Date(2025, 5, 16) → "Monday, 16 June 2025"
   *
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
    const day     = date.getDate();
    const month   = date.toLocaleDateString('en-GB', { month: 'long' });
    const year    = date.getFullYear();
    return weekday + ', ' + day + ' ' + month + ' ' + year;
  },

/**
 * Return the appropriate greeting string for a given hour (0–23).
 *
 * 05–11 → "Good Morning"
 * 12–17 → "Good Afternoon"
 * 18–20 → "Good Evening"
 * 21–04 → "Good Night"
 */
getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night';
},

  /**
   * Read the stored name, compute the current time/date/greeting,
   * and update the relevant DOM elements.
   *
   * DOM targets:
   *   #time          — HH:MM string
   *   #date          — human-readable date string
   *   #greeting-text — full greeting with embedded #user-name span
   *
   * Implements Requirements 2.1, 2.2, 2.6.
   */
  render() {
    const name = Storage.get(KEYS.NAME, 'Friend');
    const now  = new Date();

    const timeEl     = document.getElementById('time');
    const dateEl     = document.getElementById('date');
    const greetingEl = document.getElementById('greeting-text');

    if (timeEl)     timeEl.textContent = Greeting.formatTime(now);
    if (dateEl)     dateEl.textContent = Greeting.formatDate(now);
    if (greetingEl) {
      greetingEl.innerHTML =
        Greeting.getGreeting(now.getHours()) +
        ', <span id="user-name">' + name + '</span>';
    }
  },

  /**
   * Render immediately, then schedule re-renders every 60 seconds
   * so the clock stays current without a page reload.
   *
   * Implements Requirements 2.1.
   */
  startClock() {
    Greeting.render();
    setInterval(Greeting.render, 60_000);
  },

  /**
   * Open the Name Modal so the user can set or change their display name.
   * Delegates to Modal.open() which will be implemented in task 10.1.
   *
   * Implements Requirements 2.7.
   */
  openModal() {
    Modal.open('modal-name');
  },

  /**
   * Validate and persist a new user name.
   *
   * - Trims leading/trailing whitespace from `raw`.
   * - If the trimmed value is empty, does nothing (Req 2.9).
   * - Otherwise caps at 50 characters (Req 2.10), persists via
   *   Storage.set(), and re-renders the Greeting Widget (Req 2.8).
   *
   * @param {string} raw  The unprocessed string from the name input field.
   *
   * Implements Requirements 2.8, 2.9, 2.10.
   */
  submitName(raw) {
    const trimmed = String(raw).trim();
    if (trimmed === '') return;
    const capped = trimmed.slice(0, 50);
    Storage.set(KEYS.NAME, capped);
    Greeting.render();
  },
};

/* -------------------------------------------------------------
   4. Timer Module (partial)
   Pomodoro countdown timer with idle / running / paused states.
   Implements Requirements 3.1, 3.7.
   ------------------------------------------------------------- */

const Timer = {
  state:       'idle',   // 'idle' | 'running' | 'paused'
  remaining:   0,        // seconds left in current session
  sessionSecs: 0,        // full session length in seconds
  intervalId:  null,

  /**
   * Convert a raw second count into a zero-padded "MM:SS" string.
   *
   * Examples:
   *   formatMmSs(0)    → "00:00"
   *   formatMmSs(65)   → "01:05"
   *   formatMmSs(1500) → "25:00"
   *
   * Implements Requirements 3.1.
   *
   * @param {number} secs  Non-negative integer number of seconds
   * @returns {string}     "MM:SS" with both components zero-padded to 2 digits
   */
  formatMmSs(secs) {
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    return mm + ':' + ss;
  },

  /**
   * Synchronise the timer UI with the current module state.
   *
   * DOM targets:
   *   #timer-display   — updated with Timer.formatMmSs(Timer.remaining)
   *   #duration-input  — disabled while state === 'running' (Req 3.7)
   *   #btn-start       — disabled while state === 'running'
   *   #btn-stop        — disabled while state !== 'running'
   *   #btn-reset       — always enabled
   *
   * Implements Requirements 3.1, 3.7.
   */
  render() {
    const display       = document.getElementById('timer-display');
    const durationInput = document.getElementById('duration-input');
    const btnStart      = document.getElementById('btn-start');
    const btnStop       = document.getElementById('btn-stop');
    const btnReset      = document.getElementById('btn-reset');

    // Update the countdown readout.
    if (display) {
      display.textContent = Timer.formatMmSs(Timer.remaining);
    }

    // Disable the duration input while the timer is running (Req 3.7).
    if (durationInput) {
      durationInput.disabled = Timer.state === 'running';
    }

    // Start button: enabled when idle or paused; disabled when running.
    if (btnStart) {
      btnStart.disabled = Timer.state === 'running';
    }

    // Stop button: enabled only when running.
    if (btnStop) {
      btnStop.disabled = Timer.state !== 'running';
    }

    // Reset is always enabled.
    if (btnReset) {
      btnReset.disabled = false;
    }
  },

  /**
   * Transition from idle or paused → running and begin counting down.
   *
   * - Only acts when state is 'idle' or 'paused'.
   * - Sets state to 'running', starts setInterval(Timer.tick, 1000),
   *   and calls render() to sync the UI.
   *
   * Implements Requirements 3.3, 3.10.
   */
  start() {
    if (Timer.state !== 'idle' && Timer.state !== 'paused') return;
    Timer.state = 'running';
    Timer.intervalId = setInterval(Timer.tick, 1000);
    Timer.render();
  },

  /**
   * Transition from running → paused and freeze the countdown.
   *
   * - Only acts when state is 'running'.
   * - Clears the active interval and calls render() to sync the UI.
   *
   * Implements Requirements 3.4, 3.10.
   */
  stop() {
    if (Timer.state !== 'running') return;
    Timer.state = 'paused';
    clearInterval(Timer.intervalId);
    Timer.intervalId = null;
    Timer.render();
  },

  /**
   * Transition from any state → idle and restore the full session duration.
   *
   * - Clears any active interval.
   * - Resets state to 'idle' and remaining to sessionSecs.
   * - Calls render() to sync the UI.
   *
   * Implements Requirements 3.5, 3.10.
   */
  reset() {
    clearInterval(Timer.intervalId);
    Timer.intervalId = null;
    Timer.state = 'idle';
    Timer.remaining = Timer.sessionSecs;
    Timer.render();
  },

  /**
   * Called every second by the running interval.
   *
   * Decrements `remaining` by one second. If the timer has
   * reached zero, delegates to `complete()` to handle
   * end-of-session logic; otherwise calls `render()` to
   * refresh the countdown display.
   *
   * Implements Requirements 3.6.
   */
  tick() {
    Timer.remaining -= 1;
    if (Timer.remaining <= 0) {
      Timer.complete();
    } else {
      Timer.render();
    }
  },

  /**
   * Handle end-of-session: reset to idle, emit a browser
   * notification (if permitted), and always play an audible beep.
   *
   * Logic:
   *  1. Call Timer.reset() — restores idle state and full duration.
   *  2. Always call playBeep() as an audio fallback.
   *  3. If the Notification API is available:
   *       - If permission is already 'granted', fire notification.
   *       - If permission is not 'denied', request permission and
   *         fire if the user grants it.
   *
   * Implements Requirements 3.6.
   */
  complete() {
    Timer.reset();
    playBeep();

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Pomodoro complete!', { body: 'Take a break.' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') {
            new Notification('Pomodoro complete!', { body: 'Take a break.' });
          }
        });
      }
    }
  },

  /**
   * Validate and apply a new session duration.
   *
   * - Accepts only integer values in the range [1, 90] (Req 3.8, 3.9).
   * - If valid: updates `sessionSecs`, persists to localStorage,
   *   resets `remaining` to the new session length, and calls render().
   * - If invalid: silently retains the previous value (Req 3.9).
   *
   * @param {number} mins  Desired session length in minutes.
   *
   * Implements Requirements 3.8, 3.9.
   */
  setDuration(mins) {
    if (!Number.isInteger(mins) || mins < 1 || mins > 90) return;
    Timer.sessionSecs = mins * 60;
    Storage.set(KEYS.DURATION, mins);
    Timer.remaining = Timer.sessionSecs;
    Timer.render();
  },
};

/* -------------------------------------------------------------
   playBeep — Web Audio API audible alert
   Always called by Timer.complete() as a fallback regardless of
   whether browser notifications are available or permitted.
   Implements Requirements 3.6.
   ------------------------------------------------------------- */

/**
 * Play a short 440 Hz tone that fades out over ~0.8 seconds using
 * the Web Audio API.
 */
function playBeep() {
  const ctx  = new AudioContext();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}

/* -------------------------------------------------------------
   Timer button event wiring
   Wires click and keyboard (Enter / Space) activation for
   #btn-start, #btn-stop, and #btn-reset.
   Implements Requirements 3.3, 3.4, 3.5, 3.10.
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  /**
   * Helper: attach click + Enter/Space keydown listeners to a button
   * that trigger a Timer method, but only when the button is not disabled.
   *
   * @param {string}   id       Element id of the button
   * @param {Function} handler  Timer method to call
   */
  function wireTimerBtn(id, handler) {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!btn.disabled) handler();
    });

    btn.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !btn.disabled) {
        e.preventDefault(); // prevent Space from scrolling the page
        handler();
      }
    });
  }

  wireTimerBtn('btn-start', Timer.start);
  wireTimerBtn('btn-stop',  Timer.stop);
  wireTimerBtn('btn-reset', Timer.reset);
});

/* -------------------------------------------------------------
   5. TodoList Module
   Manages an array of Task objects and renders the task list.
   Implements Requirements 4.1, 4.2, 4.3, 4.10.

   Task shape: { id: string, text: string, done: boolean, createdAt: number }
   ------------------------------------------------------------- */

const TodoList = {
  tasks: [],

  /**
   * Read the persisted task array from Storage and populate TodoList.tasks.
   * Falls back to an empty array if nothing is stored or parsing fails.
   */
  load() {
    TodoList.tasks = Storage.get(KEYS.TASKS, []);
  },

  /**
   * Write the current TodoList.tasks array to Storage.
   * Implements Requirement 4.3.
   */
  save() {
    Storage.set(KEYS.TASKS, TodoList.tasks);
  },

  /**
   * Create a new task from `text` and add it to the list.
   *
   * - Trims leading/trailing whitespace from `text`.
   * - If the trimmed value is empty, returns without mutation (Req 4.2).
   * - Otherwise creates a Task object, pushes it to tasks, saves, and re-renders.
   *
   * ID generation uses `crypto.randomUUID()` with a `Date.now() + Math.random()`
   * string fallback for environments that don't support it.
   *
   * Implements Requirements 4.1, 4.2, 4.3.
   *
   * @param {string} text  Raw text from the input field.
   */
  add(text) {
    const trimmed = String(text).trim();
    if (trimmed === '') return;

    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : String(Date.now()) + String(Math.random());

    const task = {
      id:        id,
      text:      trimmed,
      done:      false,
      createdAt: Date.now(),
    };

    TodoList.tasks.push(task);
    TodoList.save();
    TodoList.render();
  },

  /**
   * Sort and render the current task list into #task-list.
   *
   * Sort order (Req 4.10):
   *   1. Incomplete tasks (done === false) before completed tasks (done === true).
   *   2. Within each group, ascending by createdAt (insertion order).
   *
   * Each <li> contains:
   *   - A checkbox <input type="checkbox"> (checked when done) that calls TodoList.toggle(id).
   *   - A <span class="task-text"> with the task text.
   *   - An edit <button aria-label="Edit task"> that calls TodoList.startEdit(id).
   *   - A delete <button class="btn-danger" aria-label="Delete task"> that calls TodoList.remove(id).
   *
   * Implements Requirements 4.1, 4.10.
   */
  render() {
    const list = document.getElementById('task-list');
    if (!list) return;

    // Sort: incomplete first, then completed; stable by createdAt within each group.
    const sorted = TodoList.tasks.slice().sort(function (a, b) {
      // Convert boolean to number: false → 0, true → 1
      const doneA = a.done ? 1 : 0;
      const doneB = b.done ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return a.createdAt - b.createdAt;
    });

    // Clear existing content.
    list.innerHTML = '';

    sorted.forEach(function (task) {
      const li = document.createElement('li');
      li.dataset.id = task.id;
      if (task.done) {
        li.className = 'done';
      }

      // Checkbox — toggles completion status.
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('click', function () {
        TodoList.toggle(task.id);
      });

      // Text span.
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;

      // Edit button.
      const editBtn = document.createElement('button');
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () {
        TodoList.startEdit(task.id);
      });

      // Delete button.
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        TodoList.remove(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },

  /**
   * Flip the `done` flag on the task with the given id, then save and re-render.
   *
   * Implements Requirements 4.4.
   *
   * @param {string} id  Task id
   */
  toggle(id) {
    const task = TodoList.tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    task.done = !task.done;
    TodoList.save();
    TodoList.render();
  },

  /**
   * Replace the task's text span with an inline <input> pre-filled with the
   * current task text so the user can edit it in place.
   *
   * Behaviour:
   *   - On Enter or blur: calls confirmEdit(id, input.value).
   *   - On Escape: restores the original span without saving.
   *
   * Implements Requirements 4.5.
   *
   * @param {string} id  Task id
   */
  startEdit(id) {
    const task = TodoList.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    const li = document.querySelector('#task-list li[data-id="' + id + '"]');
    if (!li) return;

    const span = li.querySelector('.task-text');
    if (!span) return;

    const originalText = task.text;

    // Build the inline edit input.
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = originalText;

    // Replace span with input.
    li.replaceChild(input, span);
    input.focus();

    let committed = false;

    function commit() {
      if (committed) return;
      committed = true;
      TodoList.confirmEdit(id, input.value);
    }

    function revert() {
      if (committed) return;
      committed = true;
      // Put the original span back without any storage write.
      const restored = document.createElement('span');
      restored.className = 'task-text';
      restored.textContent = originalText;
      if (input.parentNode === li) {
        li.replaceChild(restored, input);
      }
    }

    input.addEventListener('blur', commit);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        revert();
      }
    });
  },

  /**
   * Finalise an in-place edit.
   *
   * - Trims `value`.
   * - If non-empty: updates task.text, saves, and re-renders.
   * - If empty or whitespace-only: re-renders to restore the original display
   *   without mutating the task.
   *
   * Implements Requirements 4.6, 4.7.
   *
   * @param {string} id     Task id
   * @param {string} value  Raw value from the edit input
   */
  confirmEdit(id, value) {
    const trimmed = String(value).trim();
    const task = TodoList.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    if (trimmed !== '') {
      task.text = trimmed;
      TodoList.save();
    }
    // Re-render in both cases to restore proper DOM structure.
    TodoList.render();
  },

  /**
   * Remove the task with the given id from the list, save, and re-render.
   *
   * Implements Requirements 4.8.
   *
   * @param {string} id  Task id
   */
  remove(id) {
    TodoList.tasks = TodoList.tasks.filter(function (t) { return t.id !== id; });
    TodoList.save();
    TodoList.render();
  },
};

/* -------------------------------------------------------------
   TodoList event wiring
   #task-input Enter key and #btn-add-task click → TodoList.add()
   Implements Requirements 4.1.
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  const taskInput  = document.getElementById('task-input');
  const btnAddTask = document.getElementById('btn-add-task');

  if (taskInput) {
    taskInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        TodoList.add(taskInput.value);
        taskInput.value = '';
      }
    });
  }

  if (btnAddTask) {
    btnAddTask.addEventListener('click', function () {
      if (taskInput) {
        TodoList.add(taskInput.value);
        taskInput.value = '';
      }
    });
  }

  // Load and render saved tasks on startup.
  TodoList.load();
  TodoList.render();
});

/* -------------------------------------------------------------
   6. QuickLinks Module
   Manages the array of LinkCard objects and renders the
   quick-links grid.
   Implements Requirements 5.3, 5.5, 5.8.
   ------------------------------------------------------------- */

const QuickLinks = {
  /** @type {Array<{id: string, name: string, url: string}>} */
  links: [],

  /**
   * Read the saved link cards from Storage and populate
   * QuickLinks.links.
   *
   * Implements Requirements 5.8 (insertion-order preservation
   * relies on the array order stored in localStorage).
   */
  load() {
    QuickLinks.links = Storage.get(KEYS.LINKS, []);
  },

  /**
   * Persist the current QuickLinks.links array to Storage.
   *
   * Implements Requirements 5.2, 5.6.
   */
  save() {
    Storage.set(KEYS.LINKS, QuickLinks.links);
  },

  /**
   * Normalise a URL so it always starts with a scheme.
   *
   * - If `url` already starts with "http://" or "https://", it is
   *   returned unchanged.
   * - Otherwise "https://" is prepended.
   *
   * @param {string} url  The raw URL string entered by the user.
   * @returns {string}    A URL guaranteed to begin with http:// or https://.
   *
   * Implements Requirements 5.3.
   */
  normaliseUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  },

  /**
   * Clear and rebuild the #links-grid from QuickLinks.links.
   *
   * For each link (in insertion order) a card element is created:
   *
   *   <div class="link-card">
   *     <a href="{url}" target="_blank" rel="noopener noreferrer">
   *       <span class="link-name">{name}</span>
   *     </a>
   *     <button class="btn-danger btn-delete-link" aria-label="Delete link">×</button>
   *   </div>
   *
   * The delete button's click handler calls QuickLinks.remove(link.id).
   *
   * Implements Requirements 5.5, 5.8.
   */
  render() {
    const grid = document.getElementById('links-grid');
    if (!grid) return;

    // Clear existing cards.
    grid.innerHTML = '';

    // Build and append a card for each link in insertion order.
    QuickLinks.links.forEach(function (link) {
      const card = document.createElement('div');
      card.className = 'link-card';

      // Anchor wrapping the link name — opens in a new tab.
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'link-name';
      nameSpan.textContent = link.name;

      anchor.appendChild(nameSpan);

      // Delete button.
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger btn-delete-link';
      deleteBtn.setAttribute('aria-label', 'Delete link');
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', function () {
        QuickLinks.remove(link.id);
      });

      card.appendChild(anchor);
      card.appendChild(deleteBtn);
      grid.appendChild(card);
    });
  },

};

/* -------------------------------------------------------------
   QuickLinks add() and remove()
   Implements Requirements 5.1–5.6.
   ------------------------------------------------------------- */

QuickLinks.add = function (name, url) {
  const trimName = String(name).trim();
  const trimUrl  = String(url).trim();

  if (trimName === '' || trimUrl === '') {
    // Show inline validation message (Req 5.4).
    const errEl = document.getElementById('link-error');
    if (errEl) errEl.textContent = 'Both a name and a URL are required.';
    return;
  }

  const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : String(Date.now()) + String(Math.random());

  const link = {
    id:   id,
    name: trimName.slice(0, 100),
    url:  QuickLinks.normaliseUrl(trimUrl),
  };

  QuickLinks.links.push(link);
  QuickLinks.save();
  QuickLinks.render();
};

QuickLinks.remove = function (id) {
  QuickLinks.links = QuickLinks.links.filter(function (l) { return l.id !== id; });
  QuickLinks.save();
  QuickLinks.render();
};

/* -------------------------------------------------------------
   7. Modal Utility
   Lightweight open/close helper for the Name Modal and
   Add-Link Modal.
   Implements Requirements 2.7, 5.1.
   ------------------------------------------------------------- */

const Modal = {
  /**
   * The element that was focused before the most recent modal open.
   * Used to restore focus when the modal closes (Req 7.3).
   *
   * @type {Element|null}
   */
  _lastFocus: null,

  /**
   * Show a modal by adding the 'active' class and focusing the
   * first <input> inside it. Stores the currently focused element
   * so focus can be returned when the modal closes.
   *
   * @param {string} id  The id of the modal element (e.g. 'modal-name')
   */
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // Store the trigger so we can return focus on close.
    Modal._lastFocus = document.activeElement;
    el.classList.add('active');
    const firstInput = el.querySelector('input');
    if (firstInput) firstInput.focus();
  },

  /**
   * Hide a modal by removing the 'active' class and resetting
   * all form fields inside it. Returns focus to the element that
   * was active when the modal was opened.
   *
   * Reset rules:
   *   1. Clear the value of every <input> in the modal.
   *   2. If closing #modal-link, also clear the #link-error text.
   *   3. Return focus to Modal._lastFocus if it is a focusable element.
   *
   * @param {string} id  The id of the modal element
   */
  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');

    // Clear all input values.
    el.querySelectorAll('input').forEach(function (input) {
      input.value = '';
    });

    // Clear link validation error when closing the link modal.
    if (id === 'modal-link') {
      const errEl = document.getElementById('link-error');
      if (errEl) errEl.textContent = '';
    }

    // Return focus to the element that opened the modal (Req 7.3).
    if (Modal._lastFocus && typeof Modal._lastFocus.focus === 'function') {
      Modal._lastFocus.focus();
      Modal._lastFocus = null;
    }
  },
};

/* -------------------------------------------------------------
   Modal close event wiring
   - Backdrop click → close that modal          (Req 2.7, 5.1)
   - .btn-modal-close click → close parent modal
   - Escape key → close all active modals       (Req 2.7, 5.1)
   - #btn-add-link click → Modal.open('modal-link')
   - #btn-link-submit click → QuickLinks.add() + Modal.close()
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  // Backdrop click — use event delegation on each modal element.
  // A click directly on the modal root (which IS the backdrop overlay)
  // closes it; clicks on the inner .modal-box do not bubble up to root.
  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      // Only close when the backdrop itself was clicked, not the inner box.
      if (e.target === modal) {
        Modal.close(modal.id);
      }
    });
  });

  // .btn-modal-close buttons — find the parent modal by closest('.modal').
  document.querySelectorAll('.btn-modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const modal = btn.closest('.modal');
      if (modal) Modal.close(modal.id);
    });
  });

  // Escape key — close every modal that currently has 'active'.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(function (modal) {
        Modal.close(modal.id);
      });
    }
  });

  // Open the Add-Link Modal when #btn-add-link is clicked (Req 5.1).
  const btnAddLink = document.getElementById('btn-add-link');
  if (btnAddLink) {
    btnAddLink.addEventListener('click', function () {
      Modal.open('modal-link');
    });
  }

  // Submit the new link (Req 5.2) then close the modal.
  const btnLinkSubmit = document.getElementById('btn-link-submit');
  if (btnLinkSubmit) {
    btnLinkSubmit.addEventListener('click', function () {
      const nameInput = document.getElementById('link-name-input');
      const urlInput  = document.getElementById('link-url-input');
      const name = nameInput ? nameInput.value : '';
      const url  = urlInput  ? urlInput.value  : '';

      // add() validates; it sets #link-error if invalid and returns early.
      const lengthBefore = QuickLinks.links.length;
      QuickLinks.add(name, url);

      // Only close if a card was actually added (no validation error).
      if (QuickLinks.links.length > lengthBefore) {
        Modal.close('modal-link');
      }
    });
  }

  // Load and render saved links on startup.
  QuickLinks.load();
  QuickLinks.render();
});

/* -------------------------------------------------------------
   Global init() — bootstraps all modules on DOMContentLoaded.
   Implements Requirements 1.1–1.5, 6.4.
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  // Apply persisted theme before first render to avoid FOUC (Req 6.4).
  const savedTheme = Storage.get(KEYS.THEME, 'dark');
  Theme.apply(savedTheme);

  // Initialise the Focus Timer from persisted duration (Req 1.3).
  const savedMins = Storage.get(KEYS.DURATION, 25);
  Timer.sessionSecs = savedMins * 60;
  Timer.remaining   = Timer.sessionSecs;
  Timer.render();

  // Keep the duration input in sync with the stored value.
  const durationInput = document.getElementById('duration-input');
  if (durationInput) {
    durationInput.value = savedMins;
    durationInput.addEventListener('change', function () {
      Timer.setDuration(parseInt(durationInput.value, 10));
    });
  }

  // Start the greeting clock (renders immediately, then every 60 s).
  Greeting.startClock();
});

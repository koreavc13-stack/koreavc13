// State Management
let tasks = [];
let currentFilter = 'all';
let currentPriorityFilter = 'all';
let currentSort = 'createdAt-desc';
let calCurrentDate = new Date();
let selectedDateString = '';

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskPrioritySelect = document.getElementById('task-priority');
const taskDateInput = document.getElementById('task-date');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const currentDateEl = document.getElementById('current-date');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// Stats Elements
const countTotalEl = document.getElementById('count-total');
const countActiveEl = document.getElementById('count-active');
const countCompletedEl = document.getElementById('count-completed');
const completionRatioEl = document.getElementById('completion-ratio');
const progressCircle = document.querySelector('.progress-ring__circle');
const listCountBadge = document.getElementById('list-count');

// Circle Circumference setup (r=50 -> 2 * PI * 50 = 314.159)
const CIRCUMFERENCE = 2 * Math.PI * 50;

// Initialize circular progress bar properties
if (progressCircle) {
  progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

// Set Localized Current Date
function initDate() {
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const today = new Date();
  currentDateEl.textContent = today.toLocaleDateString('ko-KR', options);
}

// Load tasks from LocalStorage
function loadTasks() {
  const savedTasks = localStorage.getItem('minimalist_tasks');
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
      tasks = [];
    }
  }
}

// Save tasks to LocalStorage
function saveTasks() {
  localStorage.setItem('minimalist_tasks', JSON.stringify(tasks));
}

// Calculate and Update Dashboard Stats
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const completionRatio = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Update counts in DOM
  countTotalEl.textContent = total;
  countActiveEl.textContent = active;
  countCompletedEl.textContent = completed;
  completionRatioEl.textContent = completionRatio;
  listCountBadge.textContent = total;

  // Animate Circular Progress
  if (progressCircle) {
    const offset = CIRCUMFERENCE - (completionRatio / 100) * CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
  }
}

// Helper to calculate D-day
function getDueDateLabel(dateString) {
  if (!dateString) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return { text: '오늘 마감', class: 'overdue' };
  } else if (diffDays < 0) {
    return { text: `기한 초과 (${Math.abs(diffDays)}일)`, class: 'overdue' };
  } else {
    return { text: `D-${diffDays}`, class: '' };
  }
}

// Render the task list based on filters and sorting
function renderTasks() {
  // 1. Filter
  let filteredTasks = tasks.filter(task => {
    const matchesStatus = 
      currentFilter === 'all' || 
      (currentFilter === 'active' && !task.completed) ||
      (currentFilter === 'completed' && task.completed);
      
    const matchesPriority =
      currentPriorityFilter === 'all' ||
      task.priority === currentPriorityFilter;
      
    return matchesStatus && matchesPriority;
  });

  // 2. Sort
  filteredTasks.sort((a, b) => {
    if (currentSort === 'createdAt-desc') {
      return b.createdAt - a.createdAt;
    } else if (currentSort === 'createdAt-asc') {
      return a.createdAt - b.createdAt;
    } else if (currentSort === 'dueDate-asc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (currentSort === 'priority-desc') {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return 0;
  });

  // Toggle Empty State view
  if (filteredTasks.length === 0) {
    taskList.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    taskList.style.display = 'flex';
    emptyState.style.display = 'none';
  }

  // Clear existing items
  taskList.innerHTML = '';

  // Render items
  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // Build Priority Badge Label
    const priorityLabels = { high: '높음', medium: '보통', low: '낮음' };
    const priorityClass = `priority-${task.priority}`;

    // Build Due Date Badge
    let dueDateBadgeHtml = '';
    const dateLabel = getDueDateLabel(task.dueDate);
    if (dateLabel) {
      dueDateBadgeHtml = `
        <span class="due-date-badge ${dateLabel.class}">
          <i data-lucide="calendar" style="width:12px;height:12px;"></i>
          ${task.dueDate} (${dateLabel.text})
        </span>
      `;
    }

    li.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <span class="checkmark"></span>
      </label>
      <div class="task-content-wrapper">
        <span class="task-title-text">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span>
          ${dueDateBadgeHtml}
          <button class="delete-btn" onclick="deleteTask('${task.id}')" aria-label="삭제">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
          </button>
        </div>
      </div>
    `;
    taskList.appendChild(li);
  });

  // Re-run Lucide parser to populate modern icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Sync Calendar and Selected Day task list
  renderCalendar();
  renderSelectedDayTasks();
}

// Prevent HTML injection
function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '=': '&#x3D;'
    }[s];
  });
}

// Add Task function
taskForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const priority = taskPrioritySelect.value;
  const dueDate = taskDateInput.value;

  if (!title) return;

  const newTask = {
    id: Date.now().toString(),
    title,
    priority,
    dueDate: dueDate || null,
    completed: false,
    createdAt: Date.now()
  };

  tasks.push(newTask);
  saveTasks();
  updateStats();
  renderTasks();

  // Reset Form
  taskForm.reset();
});

// Toggle Task Status (global so inline onchange can call it easily)
window.toggleTask = function (id) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveTasks();
  updateStats();
  
  // Add a slight delay before re-rendering list so completed status animations can trigger smoothly
  setTimeout(() => {
    renderTasks();
  }, 200);
};

// Delete Task (global so inline onclick can call it easily)
window.deleteTask = function (id) {
  // Locate item and apply exit animation
  const taskEl = document.querySelector(`.task-item[data-id="${id}"]`);
  if (taskEl) {
    taskEl.style.transform = 'translateY(-10px)';
    taskEl.style.opacity = '0';
  }

  setTimeout(() => {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    updateStats();
    renderTasks();
  }, 200);
};

// Clear Completed Tasks
clearCompletedBtn.addEventListener('click', function () {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length === 0) return;

  // Add exit transition to all completed cards
  completedTasks.forEach(task => {
    const taskEl = document.querySelector(`.task-item[data-id="${task.id}"]`);
    if (taskEl) {
      taskEl.style.transform = 'translateY(-10px)';
      taskEl.style.opacity = '0';
    }
  });

  setTimeout(() => {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    updateStats();
    renderTasks();
  }, 250);
});

// Setup View Switching, Filter & Sorting events
function initFilters() {
  // Status filter buttons
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Priority filter buttons
  document.querySelectorAll('.filter-btn[data-priority]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn[data-priority]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentPriorityFilter = this.getAttribute('data-priority');
      renderTasks();
    });
  });

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', function () {
    currentSort = this.value;
    renderTasks();
  });

  // View toggle tabs
  const viewListBtn = document.getElementById('view-list-btn');
  const viewCalendarBtn = document.getElementById('view-calendar-btn');
  const listViewContainer = document.getElementById('list-view-container');
  const calendarViewContainer = document.getElementById('calendar-view-container');

  viewListBtn.addEventListener('click', () => {
    viewListBtn.classList.add('active');
    viewCalendarBtn.classList.remove('active');
    listViewContainer.classList.add('active');
    calendarViewContainer.classList.remove('active');
  });

  viewCalendarBtn.addEventListener('click', () => {
    viewCalendarBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    calendarViewContainer.classList.add('active');
    listViewContainer.classList.remove('active');
    renderCalendar();
  });
}

// Render Calendar
function renderCalendar() {
  const calendarMonthYear = document.getElementById('calendar-month-year');
  const calendarGridDays = document.getElementById('calendar-grid-days');
  if (!calendarGridDays) return;

  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth(); // 0-11

  // Set Month/Year label
  calendarMonthYear.textContent = `${year}년 ${month + 1}월`;

  // Clear grid
  calendarGridDays.innerHTML = '';

  // Get first day of the month & total days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Add empty slots before the first day
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarGridDays.appendChild(emptyCell);
  }

  // Create date cells
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement('div');
    const dayOfWeek = (firstDayIndex + day - 1) % 7;
    
    // Classes
    let cellClass = 'calendar-day';
    if (dayOfWeek === 0) cellClass += ' sun';
    if (dayOfWeek === 6) cellClass += ' sat';

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (dateString === todayString) {
      cellClass += ' today';
    }
    if (dateString === selectedDateString) {
      cellClass += ' selected';
    }

    dayCell.className = cellClass;
    dayCell.dataset.date = dateString;

    // Day number
    const dayNumSpan = document.createElement('span');
    dayNumSpan.className = 'day-number';
    dayNumSpan.textContent = day;
    dayCell.appendChild(dayNumSpan);

    // Filter tasks for this day to show labels
    const dayTasks = tasks.filter(t => t.dueDate === dateString);
    if (dayTasks.length > 0) {
      const labelsContainer = document.createElement('div');
      labelsContainer.className = 'calendar-day-tasks';
      
      // Render maximum 2 labels to keep it tidy
      const visibleTasks = dayTasks.slice(0, 2);
      visibleTasks.forEach(t => {
        const label = document.createElement('div');
        label.className = `cal-task-label ${t.completed ? 'completed' : `priority-${t.priority}`}`;
        label.textContent = t.title;
        labelsContainer.appendChild(label);
      });

      if (dayTasks.length > 2) {
        const moreLabel = document.createElement('div');
        moreLabel.className = 'cal-task-more';
        moreLabel.textContent = `+${dayTasks.length - 2}개 더`;
        labelsContainer.appendChild(moreLabel);
      }
      dayCell.appendChild(labelsContainer);
    }

    // Click handler
    dayCell.addEventListener('click', () => {
      if (selectedDateString === dateString) {
        // Toggle off selection
        selectedDateString = '';
      } else {
        selectedDateString = dateString;
        // Populate the main task form input date
        taskDateInput.value = dateString;
      }
      
      // Update calendar display and daily task list
      renderCalendar();
      renderSelectedDayTasks();
    });

    calendarGridDays.appendChild(dayCell);
  }
}

// Render task list specific to selected calendar day
function renderSelectedDayTasks() {
  const container = document.getElementById('calendar-day-tasks');
  const titleEl = document.getElementById('selected-date-title');
  const listEl = document.getElementById('calendar-day-task-list');

  if (!container || !listEl) return;

  if (!selectedDateString) {
    container.style.display = 'none';
    return;
  }

  // Get tasks for selected date
  const dayTasks = tasks.filter(t => t.dueDate === selectedDateString);

  titleEl.textContent = selectedDateString;
  container.style.display = 'block';
  listEl.innerHTML = '';

  if (dayTasks.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.style.textAlign = 'center';
    emptyLi.style.color = 'var(--text-muted)';
    emptyLi.style.fontSize = '0.9rem';
    emptyLi.style.padding = '16px';
    emptyLi.textContent = '이 날짜에 예정된 할 일이 없습니다.';
    listEl.appendChild(emptyLi);
    return;
  }

  dayTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    const priorityLabels = { high: '높음', medium: '보통', low: '낮음' };
    const priorityClass = `priority-${task.priority}`;

    li.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <span class="checkmark"></span>
      </label>
      <div class="task-content-wrapper">
        <span class="task-title-text">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span>
          <button class="delete-btn" onclick="deleteTask('${task.id}')" aria-label="삭제">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
          </button>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Initialize calendar month navigation
function initCalendarNavigation() {
  const prevBtn = document.getElementById('cal-prev-btn');
  const nextBtn = document.getElementById('cal-next-btn');
  const todayBtn = document.getElementById('cal-today-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      calCurrentDate = new Date();
      selectedDateString = `${calCurrentDate.getFullYear()}-${String(calCurrentDate.getMonth() + 1).padStart(2, '0')}-${String(calCurrentDate.getDate()).padStart(2, '0')}`;
      taskDateInput.value = selectedDateString;
      renderCalendar();
      renderSelectedDayTasks();
    });
  }
}

// --- Goals (나의 장기 목표) ---
let goals = [];

function loadGoals() {
  const savedGoals = localStorage.getItem('minimalist_goals');
  if (savedGoals) {
    try {
      goals = JSON.parse(savedGoals);
    } catch (e) {
      console.error(e);
      goals = [];
    }
  }
}

function saveGoals() {
  localStorage.setItem('minimalist_goals', JSON.stringify(goals));
}

function renderGoals() {
  const goalsList = document.getElementById('goals-list');
  if (!goalsList) return;
  goalsList.innerHTML = '';

  goals.forEach(goal => {
    const li = document.createElement('li');
    li.className = `goals-item ${goal.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoal('${goal.id}')">
        <span class="checkmark" style="height: 18px; width: 18px; border-radius: 5px; top: 50%; transform: translateY(-50%);"></span>
      </label>
      <span class="goal-title-text">${escapeHtml(goal.title)}</span>
      <button class="delete-btn" onclick="deleteGoal('${goal.id}')" aria-label="삭제" style="padding: 4px;">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    `;
    goalsList.appendChild(li);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.toggleGoal = function(id) {
  goals = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
  saveGoals();
  renderGoals();
};

window.deleteGoal = function(id) {
  goals = goals.filter(g => g.id !== id);
  saveGoals();
  renderGoals();
};

function initGoals() {
  const goalForm = document.getElementById('goal-form');
  const goalTitleInput = document.getElementById('goal-title');

  if (goalForm) {
    goalForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const title = goalTitleInput.value.trim();
      if (!title) return;

      goals.push({
        id: Date.now().toString(),
        title,
        completed: false
      });
      saveGoals();
      renderGoals();
      goalTitleInput.value = '';
    });
  }
}

// --- Quotes (오늘의 명언) ---
const defaultQuotes = [
  { text: "삶이 있는 한 희망은 있다.", author: "키케로" },
  { text: "어제는 역사고, 내일은 미스터리이며, 오늘은 선물이다.", author: "엘리너 루스벨트" },
  { text: "성공은 최종적인 것이 아니며, 실패는 치명적인 것이 아니다. 중요한 것은 계속 나아가는 용기다.", author: "윈스턴 처칠" },
  { text: "당신이 할 수 있다고 믿든 할 수 없다고 믿든, 믿는 대로 될 것이다.", author: "헨리 포드" },
  { text: "가장 어두운 밤도 언젠가는 끝나고 해가 떠오를 것이다.", author: "빅토르 위고" }
];
let customQuotes = [];
let allQuotes = [];

function loadQuotes() {
  const savedCustom = localStorage.getItem('minimalist_custom_quotes');
  if (savedCustom) {
    try {
      customQuotes = JSON.parse(savedCustom);
    } catch (e) {
      console.error(e);
      customQuotes = [];
    }
  }
  allQuotes = [...defaultQuotes, ...customQuotes];
}

function saveQuotes() {
  localStorage.setItem('minimalist_custom_quotes', JSON.stringify(customQuotes));
  allQuotes = [...defaultQuotes, ...customQuotes];
}

function showRandomQuote() {
  const textEl = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  if (!textEl || !authorEl || allQuotes.length === 0) return;

  const randomIndex = Math.floor(Math.random() * allQuotes.length);
  const quote = allQuotes[randomIndex];
  textEl.textContent = `"${quote.text}"`;
  authorEl.textContent = quote.author ? `- ${quote.author}` : "- 작자미상";
}

function renderCustomQuotesList() {
  const listEl = document.getElementById('custom-quotes-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (customQuotes.length === 0) {
    listEl.innerHTML = '<li style="color: var(--text-muted); font-size: 0.75rem; text-align: center; display: block; background: none; border: none; padding: 12px 0;">등록된 커스텀 명언이 없습니다.</li>';
    return;
  }

  customQuotes.forEach((quote, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span style="font-size: 0.75rem; font-weight: 500;">"${escapeHtml(quote.text)}" - ${escapeHtml(quote.author || '작자미상')}</span>
      <button class="delete-btn" onclick="deleteCustomQuote(${idx})" aria-label="삭제" style="padding: 2px;">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
      </button>
    `;
    listEl.appendChild(li);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.deleteCustomQuote = function(index) {
  customQuotes.splice(index, 1);
  saveQuotes();
  renderCustomQuotesList();
  showRandomQuote();
};

function initQuotes() {
  const toggleBtn = document.getElementById('toggle-quotes-mode-btn');
  const displayView = document.getElementById('quote-display-view');
  const manageView = document.getElementById('quote-manage-view');
  const nextBtn = document.getElementById('next-quote-btn');
  const quoteForm = document.getElementById('quote-form');
  const newText = document.getElementById('new-quote-text');
  const newAuthor = document.getElementById('new-quote-author');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (manageView.style.display === 'none') {
        manageView.style.display = 'block';
        displayView.style.display = 'none';
        toggleBtn.textContent = '완료';
        renderCustomQuotesList();
      } else {
        manageView.style.display = 'none';
        displayView.style.display = 'block';
        toggleBtn.textContent = '관리';
        showRandomQuote();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', showRandomQuote);
  }

  if (quoteForm) {
    quoteForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const text = newText.value.trim();
      const author = newAuthor.value.trim();

      if (!text) return;

      customQuotes.push({ text, author });
      saveQuotes();
      renderCustomQuotesList();
      newText.value = '';
      newAuthor.value = '';
    });
  }

  showRandomQuote();
}

// ─── Theme Customizer ───────────────────────────────────────

function applyTheme(settings) {
  if (settings.bg) {
    document.documentElement.style.setProperty('--bg-color', settings.bg);
    // lighten card bg slightly compared to page bg
    document.documentElement.style.setProperty('--card-bg', settings.bg === '#1a202c' || settings.bg === '#1e1b4b' || settings.bg === '#14532d' ? '#ffffff18' : '#ffffff');
    document.body.style.background = settings.bg;
    // Auto text colour for dark backgrounds
    const isDark = isDarkColor(settings.bg);
    document.documentElement.style.setProperty('--text-main', isDark ? '#f0f4ff' : '#2d3748');
    document.documentElement.style.setProperty('--text-muted', isDark ? '#a0aec0' : '#718096');
    document.documentElement.style.setProperty('--border-color', isDark ? '#ffffff22' : '#e2e8f0');
  }
  if (settings.accent) {
    document.documentElement.style.setProperty('--primary', settings.accent);
    document.documentElement.style.setProperty('--primary-hover', shadeColor(settings.accent, -15));
    document.documentElement.style.setProperty('--primary-light', settings.accent + '22');
  }
  if (settings.font) {
    document.documentElement.style.setProperty('--font-header', `'${settings.font}', sans-serif`);
    document.documentElement.style.setProperty('--font-body', `'${settings.font}', sans-serif`);
  }
}

function isDarkColor(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 < 128;
}

function shadeColor(hex, pct) {
  const num = parseInt(hex.replace('#',''), 16);
  const amt = Math.round(2.55 * pct);
  const R = Math.min(255, Math.max(0, (num>>16) + amt));
  const G = Math.min(255, Math.max(0, ((num>>8)&0xFF) + amt));
  const B = Math.min(255, Math.max(0, (num&0xFF) + amt));
  return '#' + ((1<<24)+(R<<16)+(G<<8)+B).toString(16).slice(1);
}

function loadThemeSettings() {
  const saved = localStorage.getItem('minimalist_theme_settings');
  if (saved) {
    try {
      applyTheme(JSON.parse(saved));
    } catch(e) { console.error('theme parse error', e); }
  }
}

function saveThemeSettings(settings) {
  localStorage.setItem('minimalist_theme_settings', JSON.stringify(settings));
}

function getThemeSettings() {
  return JSON.parse(localStorage.getItem('minimalist_theme_settings') || '{}');
}

function initThemeCustomizer() {
  const settingsBtn   = document.getElementById('theme-settings-btn');
  const drawer        = document.getElementById('theme-drawer');
  const drawerClose   = document.getElementById('theme-drawer-close');
  const bgOptions     = document.getElementById('bg-theme-options');
  const accentOptions = document.getElementById('accent-color-options');
  const fonts         = document.getElementById('font-options');
  const bgPicker      = document.getElementById('bg-color-picker');
  const accentPicker  = document.getElementById('accent-color-picker');
  const resetBtn      = document.getElementById('reset-theme-btn');

  if (!settingsBtn || !drawer) return;

  // Open / Close drawer
  settingsBtn.addEventListener('click', () => {
    drawer.classList.remove('hidden');
    drawer.classList.add('active');
  });
  drawerClose && drawerClose.addEventListener('click', () => {
    drawer.classList.remove('active');
    setTimeout(() => drawer.classList.add('hidden'), 300);
  });

  // Click outside drawer to close
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
      if (drawer.classList.contains('active')) {
        drawer.classList.remove('active');
        setTimeout(() => drawer.classList.add('hidden'), 300);
      }
    }
  });

  // Background swatch buttons
  bgOptions && bgOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-bg]');
    if (!btn) return;
    const bg = btn.getAttribute('data-bg');
    const newSettings = { ...getThemeSettings(), bg };
    applyTheme(newSettings);
    saveThemeSettings(newSettings);
    if (bgPicker) bgPicker.value = bg.length === 7 ? bg : bgPicker.value;
    markActive(bgOptions, btn);
  });

  // Accent swatch buttons
  accentOptions && accentOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-accent]');
    if (!btn) return;
    const accent = btn.getAttribute('data-accent');
    const newSettings = { ...getThemeSettings(), accent };
    applyTheme(newSettings);
    saveThemeSettings(newSettings);
    if (accentPicker) accentPicker.value = accent.length === 7 ? accent : accentPicker.value;
    markActive(accentOptions, btn);
  });

  // Font buttons
  fonts && fonts.addEventListener('click', e => {
    const btn = e.target.closest('[data-font]');
    if (!btn) return;
    const font = btn.getAttribute('data-font');
    const newSettings = { ...getThemeSettings(), font };
    applyTheme(newSettings);
    saveThemeSettings(newSettings);
    markActive(fonts, btn);
  });

  // Background color picker (custom)
  if (bgPicker) {
    bgPicker.addEventListener('input', () => {
      const bg = bgPicker.value;
      const newSettings = { ...getThemeSettings(), bg };
      applyTheme(newSettings);
      saveThemeSettings(newSettings);
    });
  }

  // Accent color picker (custom)
  if (accentPicker) {
    accentPicker.addEventListener('input', () => {
      const accent = accentPicker.value;
      const newSettings = { ...getThemeSettings(), accent };
      applyTheme(newSettings);
      saveThemeSettings(newSettings);
    });
  }

  // Reset to defaults
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('minimalist_theme_settings');
      document.documentElement.removeAttribute('style');
      document.body.removeAttribute('style');
      if (bgPicker) bgPicker.value = '#f7f9fc';
      if (accentPicker) accentPicker.value = '#8a9df8';
      document.querySelectorAll('.swatch-btn, .font-btn').forEach(b => b.classList.remove('active-swatch'));
    });
  }

  // Load saved settings and apply
  loadThemeSettings();

  // Sync color pickers to saved values
  const saved = getThemeSettings();
  if (bgPicker && saved.bg) bgPicker.value = saved.bg.length === 7 ? saved.bg : bgPicker.value;
  if (accentPicker && saved.accent) accentPicker.value = saved.accent.length === 7 ? saved.accent : accentPicker.value;
}

function markActive(container, activeBtn) {
  container.querySelectorAll('button').forEach(b => b.classList.remove('active-swatch'));
  activeBtn.classList.add('active-swatch');
}

// Initial Run
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  loadTasks();
  loadGoals();
  loadQuotes();
  updateStats();
  initFilters();
  initCalendarNavigation();
  initGoals();
  initQuotes();
  renderTasks();
  renderGoals();
  initThemeCustomizer();
});

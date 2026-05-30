// ==================== 全局变量 ====================
let events = [];
let memorialDays = [];
let currentYear, currentMonth;

// 公历节日（每年固定日期）
const solarHolidays = {
  "01-01": { name: "元旦", icon: "🎉" },
  "02-14": { name: "情人节", icon: "💕" },
  "03-08": { name: "妇女节", icon: "🌸" },
  "03-12": { name: "植树节", icon: "🌳" },
  "05-01": { name: "劳动节", icon: "🔧" },
  "05-04": { name: "青年节", icon: "🎓" },
  "06-01": { name: "儿童节", icon: "🎈" },
  "07-01": { name: "建党节", icon: "⭐" },
  "08-01": { name: "建军节", icon: "🎖️" },
  "09-10": { name: "教师节", icon: "📖" },
  "10-01": { name: "国庆节", icon: "🇨🇳" }
};

// DOM 元素
let calendarDays, monthYearDisplay, eventListContainer;
let memorialListContainer, micButton, voiceStatus, feedbackMsg;

// 语音识别
let recognition = null;
let isListening = false;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  calendarDays = document.getElementById('calendarDays');
  monthYearDisplay = document.getElementById('monthYearDisplay');
  eventListContainer = document.getElementById('eventList');
  memorialListContainer = document.getElementById('memorialList');
  micButton = document.getElementById('micButton');
  voiceStatus = document.getElementById('voiceStatus');
  feedbackMsg = document.getElementById('feedbackMsg');

  // 获取当前真实日期
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  // 加载数据
  loadEvents();
  loadMemorialDays();

  // 渲染
  renderCalendar();
  renderEventList();
  renderMemorialList();
  renderHolidayList();

  // 绑定事件
  bindEvents();

  // 初始化语音
  initSpeechRecognition();

  // 检查今天是否是纪念日
  checkTodaySpecial();
});

// ==================== 日期辅助函数 ====================
function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 获取某个月的天数（自动处理闰年）
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// 获取某月1号是星期几（0=周日）
function getFirstDayWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

// ==================== 事件管理 ====================
function loadEvents() {
  const saved = localStorage.getItem('calendarEvents');
  if (saved) {
    events = JSON.parse(saved);
  } else {
    events = [];
  }
}

function saveEvents() {
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function addEvent(title, dateStr) {
  const newEvent = {
    id: Date.now(),
    title: title.trim(),
    dateStr: dateStr
  };
  events.push(newEvent);
  saveEvents();
  renderCalendar();
  renderEventList();
  speak(`已添加事件：${title}`);
  showFeedback(`已添加事件：${title}`);
}

function deleteEvent(eventId) {
  events = events.filter(e => e.id !== eventId);
  saveEvents();
  renderCalendar();
  renderEventList();
  speak(`已删除事件`);
  showFeedback(`已删除事件`);
}

function renderEventList() {
  if (events.length === 0) {
    eventListContainer.innerHTML = '<div class="empty-tip">暂无事件，点击🎤说话添加</div>';
    return;
  }
  const sorted = [...events].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  eventListContainer.innerHTML = sorted.map(ev => `
        <div class="event-item">
            <div>
                <div class="event-date"> ${ev.dateStr}</div>
                <div class="event-title">${escapeHtml(ev.title)}</div>
            </div>
            <button class="delete-event" data-id="${ev.id}">删除</button>
        </div>
    `).join('');

  document.querySelectorAll('.delete-event').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      deleteEvent(id);
    });
  });
}

// ==================== 公历节日显示 ====================
function renderHolidayList() {
  const container = document.getElementById('holidayList');
  if (!container) return;

  const holidayArray = Object.entries(solarHolidays).map(([date, info]) => ({
    date: date,
    name: info.name,
    icon: info.icon
  }));

  container.innerHTML = holidayArray.map(h =>
    `<span class="holiday-item">${h.icon} ${h.name} (${h.date})</span>`
  ).join('');
}

// 获取某天的节日
function getHoliday(month, day) {
  const key = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return solarHolidays[key] || null;
}

// ==================== 纪念日管理 ====================
function loadMemorialDays() {
  const saved = localStorage.getItem('memorialDays');
  if (saved) {
    memorialDays = JSON.parse(saved);
  } else {
    memorialDays = [];
    saveMemorialDays();
  }
}

function saveMemorialDays() {
  localStorage.setItem('memorialDays', JSON.stringify(memorialDays));
}

function addMemorialDay(name, monthDay, icon = "🎂") {
  if (!name || !monthDay) return;
  if (!/^\d{2}-\d{2}$/.test(monthDay)) {
    showFeedback('日期格式应为 05-20', true);
    return;
  }
  const newId = Date.now();
  memorialDays.push({ id: newId, name, monthDay, icon });
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  speak(`已添加纪念日：${name}`);
  showFeedback(`✅ 已添加纪念日：${name}（${monthDay}）`);

  // 添加成功后的视觉反馈
  const btn = document.getElementById('addMemorialBtn');
  if (btn) {
    const originalText = btn.innerText;
    btn.innerText = '✓ 添加成功！';
    btn.style.background = '#4caf50';
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = '';
    }, 1500);
  }
}

function deleteMemorialDay(id) {
  memorialDays = memorialDays.filter(m => m.id !== id);
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  showFeedback(`已删除纪念日`);
}

function renderMemorialList() {
  if (memorialDays.length === 0) {
    memorialListContainer.innerHTML = '<div class="empty-tip">暂无纪念日，添加一个~</div>';
    return;
  }
  memorialListContainer.innerHTML = memorialDays.map(m => `
        <div class="memorial-item">
            <div class="memorial-info">
                <span>${m.icon}</span>
                <span>${escapeHtml(m.name)}</span>
                <span style="color:#888;">${m.monthDay}</span>
            </div>
            <button class="delete-memorial" data-id="${m.id}">✖️</button>
        </div>
    `).join('');

  document.querySelectorAll('.delete-memorial').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      deleteMemorialDay(id);
    });
  });
}

// ==================== 日历渲染====================
function renderCalendar() {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startWeekday = getFirstDayWeekday(currentYear, currentMonth);

  monthYearDisplay.innerText = `${currentYear}年 ${currentMonth + 1}月`;

  let html = '';

  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="day-cell" style="background:#f8f9fa;"></div>`;
  }

  const todayStr = getTodayStr();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const monthDay = `${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // 检查节日
    const holiday = getHoliday(currentMonth, d);
    // 检查纪念日
    const memorial = memorialDays.find(m => m.monthDay === monthDay);
    // 检查事件
    const dayEvents = events.filter(e => e.dateStr === dateStr);
    // 检查是否是今天
    const isToday = dateStr === todayStr;

    let cellClass = 'day-cell';
    let extraHtml = '';

    if (holiday) {
      cellClass += ' holiday';
      extraHtml += `<div class="holiday-name">${holiday.icon}${holiday.name}</div>`;
    }

    if (memorial) {
      cellClass += ' memorial-day';
      extraHtml += `<div class="memorial-icon">${memorial.icon}</div>`;
      extraHtml += `<div class="memorial-name">${escapeHtml(memorial.name)}</div>`;
    }

    if (dayEvents.length > 0 && !memorial && !holiday) {
      cellClass += ' has-event';
      extraHtml += `<div class="event-dot">📌 ${dayEvents.length}</div>`;
    }

    if (isToday) {
      cellClass += ' today';
    }

    html += `
            <div class="${cellClass}" data-date="${dateStr}">
                <div class="day-number">${d}</div>
                ${extraHtml}
            </div>
        `;
  }

  calendarDays.innerHTML = html;

  // 绑定点击日期事件
  document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      const dayEvents = events.filter(e => e.dateStr === date);
      if (dayEvents.length > 0) {
        const titles = dayEvents.map(e => e.title).join('；');
        showFeedback(`📅 ${date} 有事件：${titles}`);
      } else {
        showFeedback(`📅 ${date} 暂无事件`);
      }
    });
  });
}

// ==================== 语音识别 ====================
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    voiceStatus.innerText = '浏览器不支持语音识别';
    if (micButton) micButton.disabled = true;
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add('listening');
    voiceStatus.innerText = '🎤 正在听... 请说话';
  };

  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove('listening');
    voiceStatus.innerText = '点击麦克风开始';
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    voiceStatus.innerText = `💬 "${text}"`;
    showFeedback(`识别到：${text}`);
    parseVoiceCommand(text);
  };

  recognition.onerror = (event) => {
    voiceStatus.innerText = `错误: ${event.error}`;
    showFeedback(`语音识别失败，请重试`, true);
    isListening = false;
    micButton.classList.remove('listening');
  };
}

function startListening() {
  if (!recognition) {
    alert('浏览器不支持语音识别，请使用Chrome');
    return;
  }
  if (isListening) {
    recognition.stop();
  }
  recognition.start();
}

// ==================== 自然语言解析 ====================
function parseVoiceCommand(text) {
  // 添加纪念日
  const memorialMatch = text.match(/(记住|添加|设置)(\d{1,2})月(\d{1,2})日(?:是)?(.*?)(生日|纪念日)/);
  if (memorialMatch) {
    const month = memorialMatch[2].padStart(2, '0');
    const day = memorialMatch[3].padStart(2, '0');
    const suffix = memorialMatch[5];
    let name = memorialMatch[4] || suffix;
    let icon = suffix === '生日' ? '🎂' : '💝';
    addMemorialDay(name, `${month}-${day}`, icon);
    return;
  }

  // 删除事件
  if (text.includes('删除')) {
    const dateMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const targetDate = `${currentYear}-${month}-${day}`;
      const toDelete = events.filter(e => e.dateStr === targetDate);
      toDelete.forEach(e => deleteEvent(e.id));
      return;
    }
    if (text.includes('明天')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = formatDate(tomorrow);
      const toDelete = events.filter(e => e.dateStr === targetDate);
      toDelete.forEach(e => deleteEvent(e.id));
      return;
    }
    return;
  }

  // 查询事件
  if (text.includes('今天有什么') || text.includes('今天的事件')) {
    const todayStr = getTodayStr();
    const todayEvents = events.filter(e => e.dateStr === todayStr);
    if (todayEvents.length === 0) {
      speak('今天没有事件');
      showFeedback('📭 今天没有事件');
    } else {
      const titles = todayEvents.map(e => e.title).join('；');
      speak(`今天有${todayEvents.length}个事件：${titles}`);
      showFeedback(`📅 今天：${titles}`);
    }
    return;
  }

  if (text.includes('明天有什么') || text.includes('明天的事件')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    const tomorrowEvents = events.filter(e => e.dateStr === tomorrowStr);
    if (tomorrowEvents.length === 0) {
      speak('明天没有事件');
    } else {
      const titles = tomorrowEvents.map(e => e.title).join('；');
      speak(`明天有${tomorrowEvents.length}个事件：${titles}`);
    }
    return;
  }

  // 添加事件
  let dateStr = null;
  let title = text;

  if (text.includes('明天')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = formatDate(tomorrow);
    title = text.replace(/明天|今天|下午|上午|点|分/g, '').trim();
  } else if (text.includes('后天')) {
    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    dateStr = formatDate(afterTomorrow);
    title = text.replace(/后天|下午|上午|点|分/g, '').trim();
  } else {
    const dateMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      dateStr = `${currentYear}-${month}-${day}`;
      title = text.replace(/\d{1,2}月\d{1,2}日/, '').trim();
    }
  }

  if (dateStr && title && title.length > 0) {
    addEvent(title, dateStr);
  } else if (text.includes('添加')) {
    showFeedback('请说"明天下午3点开会"这样的格式', true);
    speak('请说日期和事件内容');
  }
}

// ==================== 语音反馈 ====================
function speak(message) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function showFeedback(message, isError = false) {
  feedbackMsg.innerHTML = `${isError ? '⚠️' : '💬'} ${message}`;
}

// ==================== 当天特效 ====================
function checkTodaySpecial() {
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayMemorial = memorialDays.find(m => m.monthDay === monthDay);
  const todayHoliday = solarHolidays[monthDay];
  const app = document.querySelector('.calendar-app');

  if (todayMemorial) {
    app.classList.add('celebration-mode');
    showFeedback(`🎉 今天是${todayMemorial.name}！${todayMemorial.icon} 快乐！`);
    speak(`祝您${todayMemorial.name}快乐！`);
    createFloatingEffect(todayMemorial.icon);
  } else if (todayHoliday) {
    app.classList.add('celebration-mode');
    showFeedback(`🎉 今天是${todayHoliday.name}！${todayHoliday.icon}`);
    speak(`祝您${todayHoliday.name}快乐！`);
    createFloatingEffect(todayHoliday.icon);
    setTimeout(() => app.classList.remove('celebration-mode'), 5000);
  }
}

function createFloatingEffect(icon) {
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const emoji = document.createElement('div');
      emoji.innerText = icon;
      emoji.style.position = 'fixed';
      emoji.style.left = Math.random() * window.innerWidth + 'px';
      emoji.style.bottom = '0px';
      emoji.style.fontSize = (20 + Math.random() * 20) + 'px';
      emoji.style.zIndex = '9999';
      emoji.style.pointerEvents = 'none';
      emoji.style.transition = 'all 2s ease-out';
      emoji.style.opacity = '0.8';
      document.body.appendChild(emoji);
      setTimeout(() => {
        emoji.style.transform = 'translateY(-300px)';
        emoji.style.opacity = '0';
      }, 10);
      setTimeout(() => emoji.remove(), 2000);
    }, i * 150);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function bindEvents() {
  // ==================== 主日历控件 ====================
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  if (micButton) {
    micButton.addEventListener('click', startListening);
  }

  // ==================== 纪念日添加（独立控件，不干扰主日历） ====================
  const addMemorialBtn = document.getElementById('addMemorialBtn');
  const memorialNameInput = document.getElementById('memorialName');
  const memorialDateText = document.getElementById('selectedDateText');
  const dateTrigger = document.getElementById('dateTrigger');
  const datePickerPopup = document.getElementById('datePickerPopup');

  let selectedDate = null;
  let selectedIcon = '🎂';

  // 图标选择
  document.querySelectorAll('.icon-option-btn').forEach(iconBtn => {
    iconBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.icon-option-btn').forEach(btn => btn.classList.remove('selected'));
      iconBtn.classList.add('selected');
      selectedIcon = iconBtn.dataset.icon;
    });
  });

  // 默认选中生日图标
  const defaultIcon = document.querySelector('.icon-option-btn[data-icon="🎂"]');
  if (defaultIcon) defaultIcon.classList.add('selected');

  // 日期选择器独立变量（不污染主日历）
  let pickerYear = new Date().getFullYear();
  let pickerMonth = new Date().getMonth();

  function renderDatePicker() {
    const firstDay = new Date(pickerYear, pickerMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

    const yearMonthSpan = document.getElementById('pickerYearMonth');
    if (yearMonthSpan) {
      yearMonthSpan.innerText = `${pickerYear}年${pickerMonth + 1}月`;
    }

    let html = '';
    for (let i = 0; i < startWeekday; i++) {
      html += `<div class="picker-day"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      html += `<div class="picker-day ${isSelected ? 'selected' : ''}" data-year="${pickerYear}" data-month="${pickerMonth + 1}" data-day="${d}">${d}</div>`;
    }
    const pickerDays = document.getElementById('pickerDays');
    if (pickerDays) {
      pickerDays.innerHTML = html;
    }

    // 绑定日期点击事件
    document.querySelectorAll('.picker-day[data-day]').forEach(day => {
      day.addEventListener('click', (e) => {
        e.stopPropagation();
        const year = parseInt(day.dataset.year);
        const month = parseInt(day.dataset.month);
        const dayNum = parseInt(day.dataset.day);
        selectedDate = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        if (memorialDateText) {
          memorialDateText.innerText = `${month}月${dayNum}日`;
          memorialDateText.style.color = '#333';
        }
        // 关闭弹窗
        if (datePickerPopup) {
          datePickerPopup.style.display = 'none';
        }
      });
    });
  }

  // 打开/关闭日期选择器（阻止冒泡）
  if (dateTrigger) {
    dateTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (datePickerPopup) {
        const isVisible = datePickerPopup.style.display === 'block';
        if (!isVisible) {
          // 重置选择器到当前年份月份
          const today = new Date();
          pickerYear = today.getFullYear();
          pickerMonth = today.getMonth();
          renderDatePicker();
          datePickerPopup.style.display = 'block';
        } else {
          datePickerPopup.style.display = 'none';
        }
      }
    });
  }

  // 日期选择器内的月份切换（阻止冒泡）
  const pickerPrev = document.getElementById('pickerPrevMonth');
  const pickerNext = document.getElementById('pickerNextMonth');

  if (pickerPrev) {
    pickerPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerMonth--;
      if (pickerMonth < 0) {
        pickerMonth = 11;
        pickerYear--;
      }
      renderDatePicker();
    });
  }

  if (pickerNext) {
    pickerNext.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerMonth++;
      if (pickerMonth > 11) {
        pickerMonth = 0;
        pickerYear++;
      }
      renderDatePicker();
    });
  }

  // 点击日期选择器内部时不关闭（阻止冒泡）
  if (datePickerPopup) {
    datePickerPopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // 点击页面其他地方关闭弹窗（但不要干扰主日历）
  document.addEventListener('click', (e) => {
    if (datePickerPopup && datePickerPopup.style.display === 'block') {
      // 检查点击是否在日期触发器或弹窗内
      const isClickOnTrigger = dateTrigger && dateTrigger.contains(e.target);
      const isClickOnPopup = datePickerPopup.contains(e.target);
      if (!isClickOnTrigger && !isClickOnPopup) {
        datePickerPopup.style.display = 'none';
      }
    }
  });

  // 添加纪念日
  if (addMemorialBtn) {
    addMemorialBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = memorialNameInput ? memorialNameInput.value.trim() : '';
      if (!name) {
        showFeedback('请填写纪念日名称', true);
        speak('请填写纪念日名称');
        return;
      }
      if (!selectedDate) {
        showFeedback('请选择日期', true);
        speak('请选择日期');
        return;
      }
      const dateParts = selectedDate.split('-');
      const monthDay = `${dateParts[1]}-${dateParts[2]}`;
      addMemorialDay(name, monthDay, selectedIcon);
      // 清空表单
      memorialNameInput.value = '';
      if (memorialDateText) {
        memorialDateText.innerText = '点击选择日期';
        memorialDateText.style.color = '#666';
      }
      selectedDate = null;
      selectedIcon = '🎂';
      // 重置图标选中状态
      document.querySelectorAll('.icon-option-btn').forEach(btn => btn.classList.remove('selected'));
      const defaultIconBtn = document.querySelector('.icon-option-btn[data-icon="🎂"]');
      if (defaultIconBtn) defaultIconBtn.classList.add('selected');
      // 关闭弹窗
      if (datePickerPopup) {
        datePickerPopup.style.display = 'none';
      }
    });
  }
}
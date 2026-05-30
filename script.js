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
  "10-01": { name: "国庆节", icon: "🇨🇳" },
  "12-25": { name: "圣诞节", icon: "🎄" }
};

// DOM 元素
let calendarDays, monthYearDisplay, eventListContainer;
let memorialListContainer, micButton, voiceStatus, feedbackMsg;

// 语音识别
let recognition = null;
let isListening = false;

// 日期选择器变量
let pickerYear, pickerMonth;
let selectedDateForMemorial = null;
let selectedIconForMemorial = '🎂';

// ==================== 辅助函数 ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function showFeedback(message, isError = false) {
  const feedbackMsg = document.getElementById('feedbackMsg');
  if (feedbackMsg) {
    feedbackMsg.innerHTML = `${isError ? '⚠️' : '💬'} ${message}`;
  }
  console.log(message);
}

function speak(message) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

// ==================== 事件管理 ====================
function loadEvents() {
  const saved = localStorage.getItem('calendarEvents');
  events = saved ? JSON.parse(saved) : [];
}

function saveEvents() {
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function addEvent(title, dateStr) {
  events.push({ id: Date.now(), title: title.trim(), dateStr: dateStr });
  saveEvents();
  renderCalendar();
  renderEventList();
  speak(`已添加事件：${title}`);
  showFeedback(`✅ 已添加事件：${title}`);
}

function deleteEvent(eventId) {
  events = events.filter(e => e.id !== eventId);
  saveEvents();
  renderCalendar();
  renderEventList();
  speak(`已删除事件`);
  showFeedback(`🗑️ 已删除事件`);
}

function renderEventList() {
  if (!eventListContainer) return;
  if (events.length === 0) {
    eventListContainer.innerHTML = '<div class="empty-tip">暂无事件，点击🎤说话添加</div>';
    return;
  }
  const sorted = [...events].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  eventListContainer.innerHTML = sorted.map(ev => `
        <div class="event-item">
            <div>
                <div class="event-date">📆 ${ev.dateStr}</div>
                <div class="event-title">${escapeHtml(ev.title)}</div>
            </div>
            <button class="delete-event" data-id="${ev.id}">删除</button>
        </div>
    `).join('');

  document.querySelectorAll('.delete-event').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(parseInt(btn.dataset.id)));
  });
}

// ==================== 公历节日 ====================
function renderHolidayList() {
  const container = document.getElementById('holidayList');
  if (!container) return;
  container.innerHTML = Object.entries(solarHolidays).map(([date, info]) =>
    `<span class="holiday-item">${info.icon} ${info.name} (${date})</span>`
  ).join('');
}

function getHoliday(month, day) {
  const key = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return solarHolidays[key] || null;
}

// ==================== 纪念日管理 ====================
function loadMemorialDays() {
  const saved = localStorage.getItem('memorialDays');
  memorialDays = saved ? JSON.parse(saved) : [];
  saveMemorialDays();
}

function saveMemorialDays() {
  localStorage.setItem('memorialDays', JSON.stringify(memorialDays));
}

function addMemorialDay(name, monthDay, icon = "🎂") {
  if (!name || !monthDay || !/^\d{2}-\d{2}$/.test(monthDay)) {
    showFeedback('日期格式应为 05-20', true);
    return;
  }
  memorialDays.push({ id: Date.now(), name, monthDay, icon });
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  speak(`已添加纪念日：${name}`);
  showFeedback(`✅ 已添加纪念日：${name}（${monthDay}）`);
}

function deleteMemorialDay(id) {
  memorialDays = memorialDays.filter(m => m.id !== id);
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  showFeedback(`已删除纪念日`);
}

function renderMemorialList() {
  if (!memorialListContainer) return;
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
    btn.addEventListener('click', () => deleteMemorialDay(parseInt(btn.dataset.id)));
  });
}

// ==================== 日历渲染 ====================
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
    const lunarStr = getLunarDate(currentYear, currentMonth, d);


    const holiday = getHoliday(currentMonth, d);
    const memorial = memorialDays.find(m => m.monthDay === monthDay);
    const dayEvents = events.filter(e => e.dateStr === dateStr);
    const isToday = dateStr === todayStr;

    let cellClass = 'day-cell';
    let extraHtml = '';

    if (holiday) {
      cellClass += ' holiday';
      extraHtml += `<div class="holiday-name">${holiday.icon}${holiday.name}</div>`;
    }
    // 在 extraHtml 中添加
    if (lunarStr) {
      extraHtml += `<div class="lunar-date">${lunarStr}</div>`;
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

  document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      const dayEvents = events.filter(e => e.dateStr === date);
      if (dayEvents.length > 0) {
        showFeedback(`📅 ${date} 有事件：${dayEvents.map(e => e.title).join('；')}`);
      } else {
        showFeedback(`📅 ${date} 暂无事件`);
      }
    });
  });
}

// ==================== 庆祝特效 ====================
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

// ==================== 语音识别 ====================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatus.innerText = '❌ 浏览器不支持语音识别';
    if (micButton) micButton.disabled = true;
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.style.display = 'none';
    const stopBtn = document.getElementById('stopMicButton');
    if (stopBtn) stopBtn.style.display = 'flex';
    voiceStatus.innerText = '🎤 正在录音... ';
    showFeedback('🎤 开始录音');
  };

  recognition.onend = () => {
    isListening = false;
    micButton.style.display = 'flex';
    const stopBtn = document.getElementById('stopMicButton');
    if (stopBtn) stopBtn.style.display = 'none';
    voiceStatus.innerText = '⚡ 点击麦克风开始';
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    voiceStatus.innerText = `"${text}"`;
    showFeedback(`识别到：${text}`);
    parseVoiceCommand(text);
  };

  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error);
    voiceStatus.innerText = `❌ 错误: ${event.error}`;
    showFeedback(`语音识别失败，请重试`, true);
    isListening = false;
    micButton.style.display = 'flex';
    const stopBtn = document.getElementById('stopMicButton');
    if (stopBtn) stopBtn.style.display = 'none';
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

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

// ==================== 自然语言解析 ====================
function parseVoiceCommand(text) {
  console.log("识别到:", text);

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
      events.filter(e => e.dateStr === targetDate).forEach(e => deleteEvent(e.id));
      return;
    }
    speak("请说删除某月某日的事件");
    return;
  }

  // 查询事件
  if (text.includes('今天有什么') || text === '今天') {
    const todayStr = getTodayStr();
    const todayEvents = events.filter(e => e.dateStr === todayStr);
    if (todayEvents.length === 0) {
      speak('今天没有事件');
    } else {
      speak(`今天有${todayEvents.length}个事件：${todayEvents.map(e => e.title).join('；')}`);
    }
    return;
  }

  // 添加事件
  let dateStr = null;
  let title = text;

  // 下周一等
  const nextWeekMatch = text.match(/下(周一|周二|周三|周四|周五|周六|周日)/);
  if (nextWeekMatch) {
    const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 };
    const today = new Date();
    let daysToAdd = weekMap[nextWeekMatch[1]] - today.getDay();
    if (daysToAdd <= 0) daysToAdd += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    dateStr = formatDate(nextDate);
    title = text.replace(/下[周一二三四五六日]/, '').trim();
  }
  // 明天
  else if (text.includes('明天')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = formatDate(tomorrow);
    title = text.replace(/明天|下午|上午|点|分/g, '').trim();
  }
  // X月X日
  else {
    const dateMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      dateStr = `${currentYear}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      title = text.replace(/\d{1,2}月\d{1,2}日/, '').trim();
    }
  }

  if (dateStr && title) {
    if (title === '' || title === '明天') title = "提醒事项";
    addEvent(title, dateStr);
  } else if (text.includes('添加')) {
    speak('请说"明天下午3点开会"或"下周一开会"');
  }
}

// ==================== 事件绑定 ====================
function bindEvents() {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
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

  const stopMicButton = document.getElementById('stopMicButton');
  if (stopMicButton) {
    stopMicButton.addEventListener('click', stopListening);
  }

  // 图标选择
  document.querySelectorAll('.icon-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIconForMemorial = btn.dataset.icon;
    });
  });

  // 默认选中生日
  const defaultIcon = document.querySelector('.icon-option-btn[data-icon="🎂"]');
  if (defaultIcon) defaultIcon.classList.add('selected');

  // 添加纪念日按钮
  const addMemorialBtn = document.getElementById('addMemorialBtn');
  if (addMemorialBtn) {
    addMemorialBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('memorialName');
      const dateText = document.getElementById('selectedDateText');
      const name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        showFeedback('请填写纪念日名称', true);
        return;
      }
      if (!selectedDateForMemorial) {
        showFeedback('请选择日期', true);
        return;
      }

      const monthDay = `${selectedDateForMemorial.split('-')[1]}-${selectedDateForMemorial.split('-')[2]}`;
      addMemorialDay(name, monthDay, selectedIconForMemorial);

      nameInput.value = '';
      if (dateText) dateText.innerText = '点击选择日期';
      selectedDateForMemorial = null;
    });
  }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  calendarDays = document.getElementById('calendarDays');
  monthYearDisplay = document.getElementById('monthYearDisplay');
  eventListContainer = document.getElementById('eventList');
  memorialListContainer = document.getElementById('memorialList');
  micButton = document.getElementById('micButton');
  voiceStatus = document.getElementById('voiceStatus');
  feedbackMsg = document.getElementById('feedbackMsg');

  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  loadEvents();
  loadMemorialDays();

  renderCalendar();
  renderEventList();
  renderMemorialList();
  renderHolidayList();

  bindEvents();
  initSpeechRecognition();
  checkTodaySpecial();
});
// 获取农历日期
function getLunarDate(year, month, day) {
  try {
    const solar = Solar.fromDate(new Date(year, month, day));
    const lunar = solar.getLunar();
    const monthStr = lunar.getMonthInChinese();
    const dayStr = lunar.getDayInChinese();
    // 简化显示：只显示月日，如"五月初五"
    if (dayStr === '初一') {
      return monthStr;
    }
    return `${monthStr}${dayStr}`;
  } catch (e) {
    return '';
  }
}
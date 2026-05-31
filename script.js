// ==================== 全局变量 ====================
let events = [];
let memorialDays = [];
let currentYear, currentMonth;
let currentPickerYear, currentPickerMonth;

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
  events = (saved ? JSON.parse(saved) : []).map(e => ({
    ...e, time: e.time || '', notes: e.notes || ''
  }));
}

function saveEvents() {
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function addEvent(title, dateStr, time = '', notes = '') {
  title = title.replace(/[，。！？、：；,\.!\?:;'"]+$/g, '').trim();
  events.push({ id: Date.now(), title, dateStr, time, notes });
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

function updateEvent(eventId, newDateStr) {
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  const oldTitle = event.title;
  const oldDate = event.dateStr;
  event.dateStr = newDateStr;
  saveEvents();
  renderCalendar();
  renderEventList();
  speak(`已将${oldTitle}改期`);
  showFeedback(`✅ 已修改：${oldTitle}（${oldDate} → ${newDateStr}）`);
}

function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

let editingEventId = null;

function openEventDetail(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  editingEventId = eventId;
  document.getElementById('editTitle').value = ev.title;
  document.getElementById('editDate').value = ev.dateStr;
  document.getElementById('editTime').value = ev.time;
  document.getElementById('editNotes').value = ev.notes;
  document.getElementById('eventModal').style.display = 'flex';
}

function saveEventDetail() {
  const ev = events.find(e => e.id === editingEventId);
  if (!ev) return;
  ev.title = document.getElementById('editTitle').value.trim() || ev.title;
  ev.dateStr = document.getElementById('editDate').value || ev.dateStr;
  ev.time = document.getElementById('editTime').value;
  ev.notes = document.getElementById('editNotes').value.trim();
  saveEvents();
  renderCalendar();
  renderEventList();
  closeModal();
  showFeedback(`✅ 已更新事件：${ev.title}`);
}

function closeModal() {
  document.getElementById('eventModal').style.display = 'none';
  editingEventId = null;
}

function renderEventList() {
  if (!eventListContainer) return;
  if (events.length === 0) {
    eventListContainer.innerHTML = '<div class="empty-tip">暂无事件，点击🎤说话添加</div>';
    return;
  }
  const sorted = [...events].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  eventListContainer.innerHTML = sorted.map(ev => `
        <div class="event-item" data-id="${ev.id}" style="cursor:pointer">
            <div>
                <div class="event-date">📆 ${ev.dateStr}</div>
                <div class="event-title">${escapeHtml(ev.title)}</div>
            </div>
            <button class="delete-event" data-id="${ev.id}">删除</button>
        </div>
    `).join('');

  document.querySelectorAll('.delete-event').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteEvent(parseInt(btn.dataset.id)); });
  });
  document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', () => openEventDetail(parseInt(item.dataset.id)));
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
      // 解析年月日
      const dateParts = date.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);
      const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 获取当天所有内容
      const dayEvents = events.filter(e => e.dateStr === date);
      const dayMemorial = memorialDays.find(m => m.monthDay === monthDay);
      const dayHoliday = solarHolidays[monthDay];

      // 组合反馈消息
      let messageParts = [];
      if (dayHoliday) {
        messageParts.push(`${dayHoliday.icon}${dayHoliday.name}`);
      }
      if (dayMemorial) {
        messageParts.push(`${dayMemorial.icon}${dayMemorial.name}`);
      }
      if (dayEvents.length > 0) {
        messageParts.push(`事件：${dayEvents.map(e => e.title).join('、')}`);
      }

      if (messageParts.length === 0) {
        showFeedback(`${date} 暂无安排`);
      } else {
        showFeedback(`${date}：${messageParts.join('，')}`);
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

// ==================== 纪念日图标推断 ====================
function guessMemorialIcon(name) {
  const map = [
    [/生日|寿辰|诞/, '🎂'],
    [/结婚|婚礼|订婚|婚/, '💍'],
    [/纪念|周年/, '💕'],
    [/庆祝|庆/, '🎉'],
    [/快乐|乐|儿童/, '🎈'],
    [/节日|节/, '🌸'],
    [/圣诞/, '🎄'],
    [/重要|大事/, '⭐'],
    [/礼物|送礼/, '🎁'],
    [/蛋糕/, '🍰'],
    [/春节|过年|除夕/, '🧧'],
    [/成就|成功|毕业|晋升/, '🏆'],
  ];
  for (const [regex, icon] of map) {
    if (regex.test(name)) return icon;
  }
  return name.includes('纪念') ? '💕' : '🎂';
}

// ==================== 自然语言解析 ====================
function parseVoiceCommand(text) {
  console.log("识别到:", text);

  // 添加纪念日（动词前缀）: "记住5月20日结婚纪念日"
  const memorialMatch = text.match(/(记住|添加|设置)(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)(?:是)?(.*?)(生日|纪念日)/);
  if (memorialMatch) {
    const month = memorialMatch[3].padStart(2, '0');
    const day = memorialMatch[4].padStart(2, '0');
    const suffix = memorialMatch[6];
    const name = ((memorialMatch[5] || '') + suffix).trim();
    addMemorialDay(name, `${month}-${day}`, guessMemorialIcon(name));
    return;
  }

  // 添加纪念日（农历）
  if (text.includes('农历') && (text.includes('记住') || text.includes('添加') || text.includes('设置')) && (text.includes('生日') || text.includes('纪念日'))) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      const suffix = text.includes('生日') ? '生日' : '纪念日';
      const namePart = text.replace(/记住|添加|设置/, '').replace(/(?:\d{4}年)?农历(?:的)?[正一二三四五六七八九十冬腊]+月初?[一二三四五六七八九十廿三十]+/, '').trim();
      const name = (namePart || suffix).replace(/^的/, '').trim();
      addMemorialDay(name, lunarInfo.monthDay, guessMemorialIcon(name));
      return;
    }
  }

  // 添加纪念日（日期前缀）: "7月1日是我的生日"、"5月20日结婚纪念日"
  const dateFirst = text.match(/(\d{1,2})月(\d{1,2})(?:日|号)?(?:是)?(.*?)(生日|纪念日)/);
  if (dateFirst) {
    const month = dateFirst[1].padStart(2, '0');
    const day = dateFirst[2].padStart(2, '0');
    const suffix = dateFirst[4];
    const name = ((dateFirst[3] || '') + suffix).replace(/^[是的]+/, '').trim();
    addMemorialDay(name, `${month}-${day}`, guessMemorialIcon(name));
    return;
  }

  // 删除事件
  if (text.includes('删除')) {
    if (text.includes('农历')) {
      const lunarInfo = parseLunarDateFromText(text);
      if (lunarInfo) {
        const toDelete = events.filter(e => e.dateStr === lunarInfo.dateStr);
        toDelete.forEach(e => deleteEvent(e.id));
        return;
      }
    }
    const dateMatch = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)?/);
    if (dateMatch) {
      const year = dateMatch[1] || currentYear;
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const targetDate = `${year}-${month}-${day}`;
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

  // 查询农历日期
  if ((text.includes('查询') || text.includes('有什么')) && text.includes('农历')) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      const dayEvents = events.filter(e => e.dateStr === lunarInfo.dateStr);
      const dayMemorial = memorialDays.find(m => m.monthDay === lunarInfo.monthDay);
      const dayHoliday = solarHolidays[lunarInfo.monthDay];
      const monthLabel = `${lunarInfo.monthDay.split('-')[0]}月${lunarInfo.monthDay.split('-')[1]}日`;
      let parts = [];
      if (dayHoliday) parts.push(`${dayHoliday.icon}${dayHoliday.name}`);
      if (dayMemorial) parts.push(`${dayMemorial.icon}${dayMemorial.name}`);
      if (dayEvents.length > 0) parts.push(`事件：${dayEvents.map(e => e.title).join('、')}`);
      if (parts.length === 0) {
        speak(`农历那天（${monthLabel}）没有安排`);
      } else {
        speak(`${monthLabel}有 ${parts.join('，')}`);
      }
      showFeedback(`📅 ${monthLabel}：${parts.length > 0 ? parts.join('，') : '无安排'}`);
      return;
    }
  }

  // 查询事件
  if (text.includes('今天有什么') || text === '今天') {
    const today = new Date();
    const todayStr = getTodayStr();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 获取今天的所有内容
    const todayEvents = events.filter(e => e.dateStr === todayStr);
    const todayMemorial = memorialDays.find(m => m.monthDay === monthDay);
    const todayHoliday = solarHolidays[monthDay];

    // 组合反馈消息
    let messageParts = [];

    if (todayHoliday) {
      messageParts.push(`${todayHoliday.icon}${todayHoliday.name}`);
    }
    if (todayMemorial) {
      messageParts.push(`${todayMemorial.icon}${todayMemorial.name}`);
    }
    if (todayEvents.length > 0) {
      messageParts.push(`事件：${todayEvents.map(e => e.title).join('、')}`);
    }

    if (messageParts.length === 0) {
      speak('今天没有安排任何事项');
    } else {
      const reply = `今天有 ${messageParts.join('，')}`;
      speak(reply);
      showFeedback(`📅 ${reply}`);
    }
    return;
  }

  // 修改事件
  const modifyMatch = text.match(/把(.+?)改为(.+)/) || text.match(/(.+?)改到(.+)/) || text.match(/(.+?)改成(.+)/);
  if (modifyMatch) {
    let sourcePart = modifyMatch[1].trim();
    if (sourcePart.startsWith('把')) sourcePart = sourcePart.slice(1).trim();
    const targetPart = modifyMatch[2].trim();

    const sourceInfo = parseDateFromText(sourcePart);
    const targetInfo = parseDateFromText(targetPart);

    if (!sourceInfo) {
      speak('请说"把明天的会议改到4月3号"');
      return;
    }
    if (!targetInfo) {
      speak('请说"把明天的会议改到4月3号"');
      return;
    }

    const sourceTitle = sourceInfo.rest;
    const targetDateStr = targetInfo.dateStr;

    const [y, m, d] = targetDateStr.split('-').map(Number);
    if (!isValidDate(y, m, d)) {
      speak('这个日期不存在，请重新确认');
      return;
    }

    if (!sourceTitle) {
      const dayEvents = events.filter(e => e.dateStr === sourceInfo.dateStr);
      if (dayEvents.length === 0) {
        speak(`那天没有事件，试试说"把明天的吃饭改到4月3号"`);
        return;
      }
      if (dayEvents.length > 1) {
        speak(`那天有${dayEvents.length}个事件，请说明要改哪个`);
        return;
      }
      updateEvent(dayEvents[0].id, targetDateStr);
      return;
    }

    let matched = events.find(e => e.dateStr === sourceInfo.dateStr && e.title === sourceTitle);
    if (!matched) {
      const dayEvents = events.filter(e => e.dateStr === sourceInfo.dateStr);
      if (dayEvents.length === 1) {
        matched = dayEvents[0];
      } else if (dayEvents.length > 1) {
        speak(`那天有${dayEvents.length}个事件，请说清楚要改哪个`);
        return;
      } else {
        speak(`没找到${sourceTitle}，试试说"把明天的吃饭改到4月3号"`);
        return;
      }
    }
    updateEvent(matched.id, targetDateStr);
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
    title = text.replace(/明天/, '').trim();
  }
  // 今天
  else if (text.includes('今天')) {
    dateStr = getTodayStr();
    title = text.replace(/今天/, '').trim();
  }
  // 后天
  else if (text.includes('后天')) {
    const d = new Date(); d.setDate(d.getDate() + 2);
    dateStr = formatDate(d);
    title = text.replace(/后天/, '').trim();
  }
  // 昨天
  else if (text.includes('昨天')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    dateStr = formatDate(d);
    title = text.replace(/昨天/, '').trim();
  }
  // 农历日期
  else if (text.includes('农历')) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      dateStr = lunarInfo.dateStr;
      title = text.replace(/农历(?:的)?[正一二三四五六七八九十冬腊]+月初?[一二三四五六七八九十廿三十]+/, '').trim();
    }
  }
  // X月X日 / X月X号
  else {
    const dateMatch = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)?/);
    if (dateMatch) {
      const year = dateMatch[1] || currentYear;
      dateStr = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      title = text.replace(/(?:\d{4}年)?\d{1,2}月\d{1,2}(?:日|号)?/, '').trim();
    }
  }

  if (dateStr && title) {
    if (title === '' || title === '明天') title = "提醒事项";
    if (/纪念|生日/.test(title)) {
      const monthDay = dateStr.split('-').slice(1).join('-');
      addMemorialDay(title.replace(/^是/, '').trim(), monthDay, guessMemorialIcon(title));
    } else {
      addEvent(title, dateStr);
    }
  } else if (text.includes('添加')) {
    speak('请说"明天下午3点开会"或"下周一开会"');
  }
}
function initDatePicker() {
  const dateTrigger = document.getElementById('dateTrigger');
  const pickerPopup = document.getElementById('datePickerPopup');
  const pickerPrevMonth = document.getElementById('pickerPrevMonth');
  const pickerNextMonth = document.getElementById('pickerNextMonth');
  const pickerYearMonth = document.getElementById('pickerYearMonth');
  const pickerDays = document.getElementById('pickerDays');

  if (!dateTrigger) return;

  // 点击触发按钮显示/隐藏日期选择器
  dateTrigger.onclick = (e) => {
    e.stopPropagation();
    const isShow = pickerPopup.style.display === 'block';
    pickerPopup.style.display = isShow ? 'none' : 'block';
    if (!isShow) {
      // 打开时刷新日历显示
      currentPickerYear = currentYear;
      currentPickerMonth = currentMonth;
      renderPickerDays();
    }
  };

  // 点击页面其他地方关闭选择器
  document.onclick = (e) => {
    if (!dateTrigger.contains(e.target) && !pickerPopup.contains(e.target)) {
      pickerPopup.style.display = 'none';
    }
  };

  // 上一个月按钮
  pickerPrevMonth.onclick = () => {
    currentPickerMonth--;
    if (currentPickerMonth < 0) {
      currentPickerMonth = 11;
      currentPickerYear--;
    }
    renderPickerDays();
  };

  // 下一个月按钮
  pickerNextMonth.onclick = () => {
    currentPickerMonth++;
    if (currentPickerMonth > 11) {
      currentPickerMonth = 0;
      currentPickerYear++;
    }
    renderPickerDays();
  };

  function renderPickerDays() {
    pickerYearMonth.innerText = `${currentPickerYear}年${currentPickerMonth + 1}月`;

    const firstDay = new Date(currentPickerYear, currentPickerMonth, 1).getDay();
    const daysInMonth = new Date(currentPickerYear, currentPickerMonth + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="picker-day empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      html += `<div class="picker-day" data-day="${d}">${d}</div>`;
    }
    pickerDays.innerHTML = html;

    // 绑定日期点击事件
    document.querySelectorAll('.picker-day[data-day]').forEach(dayCell => {
      dayCell.onclick = () => {
        const day = parseInt(dayCell.dataset.day);
        const month = String(currentPickerMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        selectedDateForMemorial = `${currentPickerYear}-${month}-${dayStr}`;
        document.getElementById('selectedDateText').innerText = `${month}-${dayStr}`;
        pickerPopup.style.display = 'none';
        showFeedback(`已选择日期：${month}-${dayStr}`);
      };
    });
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
  initDatePicker();
  checkTodaySpecial();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
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
      return `${monthStr}月`;
    }
    return `${monthStr}月${dayStr}`;
  } catch (e) {
    return '';
  }
}

// ==================== 农历语音解析 ====================
function cnNumToNumber(str) {
  const digitMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  if (str === '正') return 1;
  if (str === '冬') return 11;
  if (str === '腊') return 12;
  if (digitMap[str] !== undefined) return digitMap[str];
  if (str === '十') return 10;
  if (str === '廿') return 20;
  if (str === '三十') return 30;
  if (str.startsWith('廿')) return 20 + (digitMap[str.slice(1)] || 0);
  if (str.startsWith('十') && str.length === 2) return 10 + (digitMap[str.slice(1)] || 0);
  if (str.includes('十') && str.length >= 2) {
    const parts = str.split('十');
    const tens = parts[0] ? (digitMap[parts[0]] || 0) : 0;
    const ones = parts[1] ? (digitMap[parts[1]] || 0) : 0;
    return tens * 10 + ones;
  }
  return null;
}

function parseLunarDateFromText(text) {
  if (!text.includes('农历')) return null;
  const match = text.match(/(?:(\d{4})年)?农历(?:的)?([正一二三四五六七八九十冬腊]+)月(初?[一二三四五六七八九十廿三十]+)/);
  if (!match) return null;
  const monthNum = cnNumToNumber(match[2]);
  let dayRaw = match[3];
  if (dayRaw.startsWith('初')) dayRaw = dayRaw.slice(1);
  const dayNum = cnNumToNumber(dayRaw);
  if (!monthNum || !dayNum) return null;
  try {
    const specifiedYear = match[1] ? parseInt(match[1], 10) : null;
    const year = specifiedYear || new Date().getFullYear();
    const lunar = Lunar.fromYmd(year, monthNum, dayNum);
    const solar = lunar.getSolar();
    const solarDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (solarDate < today) {
      const lunarNext = Lunar.fromYmd(year + 1, monthNum, dayNum);
      const solarNext = lunarNext.getSolar();
      return {
        dateStr: `${solarNext.getYear()}-${String(solarNext.getMonth()).padStart(2, '0')}-${String(solarNext.getDay()).padStart(2, '0')}`,
        monthDay: `${String(solarNext.getMonth()).padStart(2, '0')}-${String(solarNext.getDay()).padStart(2, '0')}`,
      };
    }
    return {
      dateStr: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      monthDay: `${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
    };
  } catch (e) {
    console.error('农历转换失败:', e);
    return null;
  }
}

function getYearFromMatch(match) {
  return match[1] ? parseInt(match[1], 10) : new Date().getFullYear();
}

function parseDateFromText(text) {
  if (!text) return null;

  // 农历
  if (text.includes('农历')) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      const regex = /(?:\d{4}年)?农历(?:的)?[正一二三四五六七八九十冬腊]+月初?[一二三四五六七八九十廿三十]+/;
      return { dateStr: lunarInfo.dateStr, rest: text.replace(regex, '').replace(/^的/, '').trim() };
    }
  }

  // 下周一~日
  let match = text.match(/下(周一|周二|周三|周四|周五|周六|周日)/);
  if (match) {
    const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 };
    const today = new Date();
    let daysToAdd = weekMap[match[1]] - today.getDay();
    if (daysToAdd <= 0) daysToAdd += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/下[周一二三四五六日](.*?)/, '').replace(/^的/, '').trim() };
  }

  // 明天
  if (text.includes('明天')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/明天/, '').replace(/^的/, '').trim() };
  }

  // 今天
  if (text.includes('今天')) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/今天/, '').replace(/^的/, '').trim() };
  }

  // 后天
  if (text.includes('后天')) {
    const d = new Date(); d.setDate(d.getDate() + 2);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/后天/, '').replace(/^的/, '').trim() };
  }

  // 昨天
  if (text.includes('昨天')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/昨天/, '').replace(/^的/, '').trim() };
  }

  // X月X日 / X月X号（数字）
  match = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)?/);
  if (match) {
    const year = getYearFromMatch(match);
    const dateStr = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    return { dateStr, rest: text.replace(match[0], '').replace(/^的/, '').trim() };
  }

  // X月X号（中文数字）
  match = text.match(/(?:(\d{4})年)?([一二三四五六七八九十十一十二]+)月([一二三四五六七八九十廿三十]+)(?:日|号)?/);
  if (match) {
    const month = cnNumToNumber(match[2]);
    const day = cnNumToNumber(match[3]);
    if (month && day) {
      const year = getYearFromMatch(match);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { dateStr, rest: text.replace(match[0], '').replace(/^的/, '').trim() };
    }
  }

  // X月X号（中文月 + 数字日），如 "四月3号"
  match = text.match(/(?:(\d{4})年)?([一二三四五六七八九十十一十二]+)月(\d{1,2})(?:日|号)?/);
  if (match) {
    const month = cnNumToNumber(match[2]);
    const day = parseInt(match[3], 10);
    if (month && day) {
      const year = getYearFromMatch(match);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { dateStr, rest: text.replace(match[0], '').replace(/^的/, '').trim() };
    }
  }

  // X月X号（数字月 + 中文日），如 "4月三号"
  match = text.match(/(?:(\d{4})年)?(\d{1,2})月([一二三四五六七八九十廿三十]+)(?:日|号)?/);
  if (match) {
    const month = parseInt(match[2], 10);
    const day = cnNumToNumber(match[3]);
    if (month && day) {
      const year = getYearFromMatch(match);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { dateStr, rest: text.replace(match[0], '').replace(/^的/, '').trim() };
    }
  }

  return null;
}
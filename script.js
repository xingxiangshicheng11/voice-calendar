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
let selectedMemorialEditIcon = '🎂';

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

function openEventModalForAdd() {
  editingEventId = null;
  document.getElementById('editTitle').value = '';
  document.getElementById('editDate').value = getTodayStr();
  document.getElementById('editTime').value = '';
  document.getElementById('editNotes').value = '';
  document.querySelector('#eventModal h3').innerText = '📝 添加事件';
  document.getElementById('saveEventBtn').innerText = '添加';
  document.getElementById('eventModal').style.display = 'flex';
}

function openEventDetail(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  editingEventId = eventId;
  document.querySelector('#eventModal h3').innerText = '✏️ 编辑事件';
  document.getElementById('saveEventBtn').innerText = '保存';
  document.getElementById('editTitle').value = ev.title;
  document.getElementById('editDate').value = ev.dateStr;
  document.getElementById('editTime').value = ev.time;
  document.getElementById('editNotes').value = ev.notes;
  document.getElementById('eventModal').style.display = 'flex';
}

function saveEventDetail() {
  const title = document.getElementById('editTitle').value.trim();
  const dateStr = document.getElementById('editDate').value;
  const time = document.getElementById('editTime').value;
  const notes = document.getElementById('editNotes').value.trim();
  if (!title) { showFeedback('请输入事件名称', true); return; }
  if (!dateStr) { showFeedback('请选择日期', true); return; }

  if (editingEventId === null) {
    addEvent(title, dateStr, time, notes);
    closeModal();
    return;
  }

  const ev = events.find(e => e.id === editingEventId);
  if (!ev) return;
  ev.title = title || ev.title;
  ev.dateStr = dateStr || ev.dateStr;
  ev.time = time;
  ev.notes = notes;
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
  memorialDays = (saved ? JSON.parse(saved) : []).map(m => ({
    ...m, notes: m.notes || ''
  }));
  saveMemorialDays();
}

function saveMemorialDays() {
  localStorage.setItem('memorialDays', JSON.stringify(memorialDays));
}

function triggerCelebrationIfToday(monthDay, name, icon) {
  const today = new Date();
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (monthDay !== todayMonthDay) return;
  const app = document.querySelector('.calendar-app');
  if (!app) return;
  app.classList.add('celebration-mode');
  showFeedback(`🎉 今天是${name}！${icon} 快乐！`);
}

function addMemorialDay(name, monthDay, icon = "🎂", notes = '') {
  if (!name || !monthDay || !/^\d{2}-\d{2}$/.test(monthDay)) {
    showFeedback('日期格式应为 05-20', true);
    return;
  }
  memorialDays.push({ id: Date.now(), name, monthDay, icon, notes });
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  triggerCelebrationIfToday(monthDay, name, icon);
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
        <div class="memorial-item" data-id="${m.id}" style="cursor:pointer">
            <div class="memorial-info">
                <span>${m.icon}</span>
                <span>${escapeHtml(m.name)}</span>
                <span style="color:#888;">${m.monthDay}</span>
            </div>
            <button class="delete-memorial" data-id="${m.id}">✖️</button>
        </div>
    `).join('');

  document.querySelectorAll('.delete-memorial').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteMemorialDay(parseInt(btn.dataset.id)); });
  });
  document.querySelectorAll('.memorial-item').forEach(item => {
    item.addEventListener('click', () => openMemorialDetail(parseInt(item.dataset.id)));
  });
}

let editingMemorialId = null;

function openMemorialDetail(id) {
  const m = memorialDays.find(mem => mem.id === id);
  if (!m) return;
  editingMemorialId = id;
  document.getElementById('editMemName').value = m.name;
  const [month, day] = m.monthDay.split('-');
  const year = new Date().getFullYear();
  document.getElementById('editMemDate').value = `${year}-${month}-${day}`;
  document.getElementById('editMemNotes').value = m.notes;
  selectedMemorialEditIcon = m.icon;
  document.querySelectorAll('#memorialModal .icon-option-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.icon === m.icon);
  });
  document.getElementById('memorialModal').style.display = 'flex';
}

function saveMemorialDetail() {
  const m = memorialDays.find(mem => mem.id === editingMemorialId);
  if (!m) return;
  const name = document.getElementById('editMemName').value.trim();
  const fullDate = document.getElementById('editMemDate').value;
  if (!name || !fullDate) { showFeedback('名称和日期不能为空', true); return; }
  m.name = name;
  m.monthDay = `${fullDate.split('-')[1]}-${fullDate.split('-')[2]}`;
  m.icon = selectedMemorialEditIcon;
  m.notes = document.getElementById('editMemNotes').value.trim();
  saveMemorialDays();
  renderCalendar();
  renderMemorialList();
  closeMemorialModal();
  showFeedback(`✅ 已更新纪念日：${m.name}`);
}

function closeMemorialModal() {
  document.getElementById('memorialModal').style.display = 'none';
  editingMemorialId = null;
}

function openHelpModal() {
  document.getElementById('helpModal').style.display = 'flex';
}

function closeHelpModal() {
  document.getElementById('helpModal').style.display = 'none';
}

// ==================== 时间段汇总 ====================
function closeSummaryModal() {
  document.getElementById('summaryModal').style.display = 'none';
}

function getDateRange(type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = (d) => d.getFullYear();
  const m = (d) => d.getMonth();
  const fmt = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // 单日查询: "date:2026-05-08"
  const dateRangeMatch = type.match(/^date:(\d{4}-\d{2}-\d{2})$/);
  if (dateRangeMatch) {
    const [y, m, d] = dateRangeMatch[1].split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return { start: fmt(date), end: fmt(date), label: `${y}年${m}月${d}日` };
  }

  // 月份名: "6月" "六月" "12月" "十二月"
  const monthMatch = type.match(/^(\d{1,2}|[一二三四五六七八九十十一十二]+)月$/);
  if (monthMatch) {
    let monthNum = monthMatch[1];
    if (/^\d+$/.test(monthNum)) monthNum = parseInt(monthNum, 10);
    else monthNum = cnNumToNumber(monthNum);
    if (monthNum >= 1 && monthNum <= 12) {
      const start = new Date(y(today), monthNum - 1, 1);
      const end = new Date(y(today), monthNum, 0);
      return { start: fmt(start), end: fmt(end), label: `${y(today)}年${monthNum}月` };
    }
  }

  // 具体星期: "下三"=下周三 "这三"=这周三 "上三"=上周三
  const weekdayNum = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
  const weekdayMatch = type.match(/^([上下这])([一二三四五六日天])$/);
  if (weekdayMatch) {
    const offset = weekdayMatch[1] === '上' ? -7 : weekdayMatch[1] === '下' ? 7 : 0;
    const targetDay = weekdayNum[weekdayMatch[2]];
    if (targetDay === undefined) return null;
    const currentDay = today.getDay();
    const diff = targetDay - currentDay + offset;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const prefix = weekdayMatch[1] === '这' ? '本' : weekdayMatch[1];
    return { start: fmt(target), end: fmt(target), label: `${prefix}周${weekdayMatch[2]}` };
  }

  switch (type) {
    case '今天': return { start: fmt(today), end: fmt(today), label: '今天' };
    case '明天': {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return { start: fmt(t), end: fmt(t), label: '明天' };
    }
    case '昨天': {
      const t = new Date(today); t.setDate(t.getDate() - 1);
      return { start: fmt(t), end: fmt(t), label: '昨天' };
    }
    case '后天': {
      const t = new Date(today); t.setDate(t.getDate() + 2);
      return { start: fmt(t), end: fmt(t), label: '后天' };
    }
    case '本周': case '这周': {
      const dayOfWeek = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun), label: '本周' };
    }
    case '上周': case '上星期': {
      const dayOfWeek = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun), label: '上周' };
    }
    case '下周': case '下星期': {
      const dayOfWeek = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun), label: '下周' };
    }
    case '本月': case '这个月': {
      const start = new Date(y(today), m(today), 1);
      const end = new Date(y(today), m(today) + 1, 0);
      return { start: fmt(start), end: fmt(end), label: `${y(today)}年${m(today) + 1}月` };
    }
    case '上月': case '上个月': {
      const start = new Date(y(today), m(today) - 1, 1);
      const end = new Date(y(today), m(today), 0);
      return { start: fmt(start), end: fmt(end), label: `${start.getFullYear()}年${start.getMonth() + 1}月` };
    }
    case '下月': case '下个月': {
      const start = new Date(y(today), m(today) + 1, 1);
      const end = new Date(y(today), m(today) + 2, 0);
      return { start: fmt(start), end: fmt(end), label: `${end.getFullYear()}年${end.getMonth() + 1}月` };
    }
    default: return null;
  }
}

function buildSummaryData(startStr, endStr) {
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);

  const dateEvents = events.filter(e => {
    const d = new Date(e.dateStr);
    return d >= startDate && d <= endDate;
  }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  const startMonthDay = startStr.slice(5);
  const endMonthDay = endStr.slice(5);
  const memorials = memorialDays.filter(m => m.monthDay >= startMonthDay && m.monthDay <= endMonthDay);

  const holidays = [];
  const startMonth = parseInt(startStr.split('-')[1]);
  const endMonth = parseInt(endStr.split('-')[1]);
  Object.entries(solarHolidays).forEach(([md, info]) => {
    const m = parseInt(md.split('-')[0]);
    const d = parseInt(md.split('-')[1]);
    if (m >= startMonth && m <= endMonth) {
      const dateStr = `${startStr.slice(0, 4)}-${md}`;
      const holidayDate = new Date(dateStr);
      if (holidayDate >= startDate && holidayDate <= endDate) {
        holidays.push({ date: dateStr, monthDay: md, ...info });
      }
    }
  });

  return { dateEvents, memorials, holidays };
}

function openSummaryModal(type, noSpeak) {
  const range = getDateRange(type);
  if (!range) return;

  const data = buildSummaryData(range.start, range.end);

  const title = document.getElementById('summaryTitle');
  title.innerText = `📋 ${range.label}的事件清单`;

  const body = document.getElementById('summaryBody');
  let html = '';

  if (data.dateEvents.length === 0 && data.memorials.length === 0 && data.holidays.length === 0) {
    html = '<div class="summary-empty">暂无安排</div>';
  } else {
    html += `<div class="summary-count">共 ${data.dateEvents.length} 个事件`;
    if (data.holidays.length > 0) html += `、${data.holidays.length} 个节日`;
    if (data.memorials.length > 0) html += `、${data.memorials.length} 个纪念日`;
    html += '</div>';

    let currentDate = '';
    data.dateEvents.forEach(ev => {
      const dateLabel = ev.dateStr.slice(5);
      if (ev.dateStr !== currentDate) {
        if (currentDate) html += '</div>';
        currentDate = ev.dateStr;
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(ev.dateStr).getDay()];
        html += `<div class="summary-date-group"><div class="summary-date-header">📅 ${dateLabel} (周${weekday})</div>`;
      }
      const timeStr = ev.time ? ` ${ev.time}` : '';
      html += `<div class="summary-event-item"><div class="summary-event-content">${timeStr} ${escapeHtml(ev.title)}${ev.notes ? `<div class="summary-note">📝 ${escapeHtml(ev.notes)}</div>` : ''}</div><button class="summary-edit-btn" data-type="event" data-id="${ev.id}">✏️</button></div>`;
    });
    if (data.dateEvents.length > 0) html += '</div>';

    if (data.holidays.length > 0) {
      html += '<div class="summary-date-group"><div class="summary-date-header">🎉 节日</div>';
      data.holidays.forEach(h => {
        html += `<div class="summary-event-item">${h.icon} ${h.name} (${h.monthDay})</div>`;
      });
      html += '</div>';
    }

    if (data.memorials.length > 0) {
      html += '<div class="summary-date-group"><div class="summary-date-header">🎂 纪念日</div>';
      data.memorials.forEach(m => {
        html += `<div class="summary-event-item"><div class="summary-event-content">${m.icon} ${escapeHtml(m.name)} (${m.monthDay})${m.notes ? `<div class="summary-note">📝 ${escapeHtml(m.notes)}</div>` : ''}</div><button class="summary-edit-btn" data-type="memorial" data-id="${m.id}">✏️</button></div>`;
      });
      html += '</div>';
    }
  }

  body.innerHTML = html;

  body.querySelectorAll('.summary-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      closeSummaryModal();
      if (btn.dataset.type === 'memorial') {
        openMemorialDetail(id);
      } else {
        openEventDetail(id);
      }
    });
  });

  document.getElementById('summaryModal').style.display = 'flex';

  if (!noSpeak) speak('已为您生成事件清单，请查收');
}

function speakSummaryContent() {
  const titleEl = document.getElementById('summaryTitle');
  const bodyEl = document.getElementById('summaryBody');
  const title = titleEl ? titleEl.innerText : '事件清单';
  const bodyText = bodyEl ? bodyEl.innerText : '';

  let parts = [];
  const lines = bodyText.split('\n').filter(l => l.trim());
  lines.forEach(line => {
    let text = line.trim();
    text = text.replace(/^共/, '其中共');
    text = text.replace(/^📅/, '');
    text = text.replace(/^🎉/, '');
    text = text.replace(/^🎂/, '');
    text = text.replace(/^[🟢🔴🟡]/g, '');
    text = text.replace(/\(周[一二三四五六日]\)/g, '');
    if (text) parts.push(text);
  });

  const fullText = title + '。' + parts.join('。');
  speak(fullText);
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
      openSummaryModal('date:' + cell.dataset.date, true);
    });
  });
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
  } else if (todayHoliday) {
    app.classList.add('celebration-mode');
    showFeedback(`🎉 今天是${todayHoliday.name}！${todayHoliday.icon}`);
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
    [/生日|寿辰|诞辰|诞|寿星|生辰|满月|周岁|过寿|祝寿|寿宴|庆生/, '🎂'],
    [/结婚|婚礼|订婚|求婚|婚|嫁|娶|婚纱|新婚|银婚|金婚|表白|告白|脱单|领证|喜酒|钻戒|定亲/, '💍'],
    [/纪念|周年|留念|铭记|回忆|七夕/, '💕'],
    [/庆祝|庆贺|庆功|派对|欢庆|贺喜|喜事|贺|恭喜|大喜|接风|饯行|迎新|欢送|开业|开张|乔迁|搬家|升职|升官|中奖/, '🎉'],
    [/快乐|欢乐|儿童|开心|幸福|愉悦|喜悦|美满|甜蜜|温馨|浪漫|旅行|度假/, '🎈'],
    [/节日|佳节|庆典|团圆|中秋|端午|重阳|清明|元宵|腊八|赏月|踏青/, '🌸'],
    [/圣诞|耶诞|平安夜/, '🎄'],
    [/重要|大事|关键|隆重|重大|特别|里程碑|转折点|难忘|深刻|非凡|意义重大|历史性/, '⭐'],
    [/礼物|送礼|赠礼|礼品|馈赠|赠送|惊喜|红包/, '🎁'],
    [/蛋糕|甜品|点心|甜点|奶油|烘焙/, '🍰'],
    [/春节|过年|除夕|新年|新春|拜年|年夜饭|守岁|元宵|年三十|压岁钱/, '🧧'],
    [/成就|成功|毕业|晋升|得奖|获奖|夺冠|满分|第一|冠军|金榜|凯旋|晋级|升学|入职|上岸|题名|通过|过关|达成|实现|考研|加薪|退休/, '🏆'],
  ];
  for (const [regex, icon] of map) {
    if (regex.test(name)) return icon;
  }
  return name.includes('纪念') ? '💕' : '🎂';
}

// ==================== 自然语言解析 ====================
function parseVoiceCommand(text) {
  console.log("识别到:", text);

  // 时间段汇总查询: "今天/本周/这个月都有什么事"
  const summaryKeywords = [
    { type: '今天', words: ['今天都有什么', '今天都有啥', '今天有什么', '今天有啥', '今天什么事', '今天安排', '今天任务', '今天计划'] },
    { type: '明天', words: ['明天都有什么', '明天都有啥', '明天有什么', '明天有啥', '明天什么事', '明天安排', '明天任务', '明天计划'] },
    { type: '昨天', words: ['昨天都有什么', '昨天都有啥', '昨天有什么', '昨天有啥', '昨天什么事', '昨天安排', '昨天任务', '昨天计划'] },
    { type: '后天', words: ['后天都有什么', '后天都有啥', '后天有什么', '后天有啥', '后天什么事', '后天安排', '后天任务', '后天计划'] },
    { type: '本周', words: ['这周都有什么', '本周都有什么', '这周都有啥', '本周都有啥', '这周有什么', '本周有什么', '这周什么事', '本周什么事', '这周安排', '本周安排'] },
    { type: '上周', words: ['上周都有什么', '上星期都有什么', '上周都有啥', '上周有什么', '上周什么事', '上周安排'] },
    { type: '下周', words: ['下周都有什么', '下星期都有什么', '下周都有啥', '下周有什么', '下周什么事', '下周安排'] },
    { type: '本月', words: ['这个月都有什么', '本月都有什么', '这个月都有啥', '本月都有啥', '这个月有什么', '本月有什么', '这个月什么事', '本月什么事', '这个月安排', '本月安排', '这个月任务', '本月任务', '这个月计划', '本月计划'] },
    { type: '上月', words: ['上个月都有什么', '上月都有什么', '上个月都有啥', '上月都有啥', '上个月有什么', '上月有什么', '上个月什么事', '上月什么事', '上个月安排', '上月安排'] },
    { type: '下月', words: ['下个月都有什么', '下月都有什么', '下个月都有啥', '下月都有啥', '下个月有什么', '下月有什么', '下个月什么事', '下月什么事', '下个月安排', '下月安排'] },
  ];
  for (const { type, words } of summaryKeywords) {
    for (const word of words) {
      if (text.includes(word)) {
        openSummaryModal(type);
        return;
      }
    }
  }
  // 月份名汇总: "六月有什么/七月都有什么事/12月安排"
  const monthSummaryMatch = text.match(/([一二三四五六七八九十十一十二1-9]|1[0-2])月(?:都)?(?:有)?(?:什么|啥)(?:事|安排|任务|计划)?/);
  if (monthSummaryMatch) {
    let monthNum = monthSummaryMatch[1];
    if (/^\d+$/.test(monthNum)) monthNum = parseInt(monthNum, 10);
    else monthNum = cnNumToNumber(monthNum);
    if (monthNum >= 1 && monthNum <= 12) {
      openSummaryModal(monthNum + '月');
      return;
    }
  }

  // 星期汇总: "下周三有什么事/这周三都有什么/上周三什么安排"
  const weekdaySummaryMatch = text.match(/((?:上|下)(?:周|星期)|这周|本周)([一二三四五六日天])(?:都)?(?:有)?(?:什么|啥)(?:事|安排|任务|计划)?/);
  if (weekdaySummaryMatch) {
    let prefix = weekdaySummaryMatch[1];
    const day = weekdaySummaryMatch[2];
    if (prefix === '这周' || prefix === '本周') prefix = '这';
    else prefix = prefix.charAt(0);
    openSummaryModal(prefix + day);
    return;
  }

  // 单独的时间词（如只说"今天"）
  const singleDayWords = { '今天': '今天', '明天': '明天', '昨天': '昨天', '后天': '后天' };
  if (singleDayWords[text]) {
    openSummaryModal(singleDayWords[text]);
    return;
  }

  // 日期查询: "五月八号有什么活动" / "5月8号有什么事"
  let queryDateStr = null;
  // 中文月+中文日: 五月八号有什么活动
  const cnQuery = text.match(/([一二三四五六七八九十十一十二]+)月([一二三四五六七八九十廿三十]+)(?:日|号)?(?:都有|都)?(?:有没有|有)?(?:什么|啥)(?:事|活动|安排|任务|计划)?/);
  if (cnQuery) {
    const month = cnNumToNumber(cnQuery[1]);
    const day = cnNumToNumber(cnQuery[2]);
    const y = new Date().getFullYear();
    if (month && day && isValidDate(y, month, day)) {
      queryDateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // 数字月+数字日: 5月8号有什么活动
  if (!queryDateStr) {
    const numQuery = text.match(/(\d{1,2})月(\d{1,2})(?:日|号)?(?:都有|都)?(?:有没有|有)?(?:什么|啥)(?:事|活动|安排|任务|计划)?/);
    if (numQuery) {
      const month = parseInt(numQuery[1], 10);
      const day = parseInt(numQuery[2], 10);
      const y = new Date().getFullYear();
      if (isValidDate(y, month, day)) {
        queryDateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  // 中文月+数字日: 五月8号有什么活动
  if (!queryDateStr) {
    const cnMonthQuery = text.match(/([一二三四五六七八九十十一十二]+)月(\d{1,2})(?:日|号)?(?:都有|都)?(?:有没有|有)?(?:什么|啥)(?:事|活动|安排|任务|计划)?/);
    if (cnMonthQuery) {
      const month = cnNumToNumber(cnMonthQuery[1]);
      const day = parseInt(cnMonthQuery[2], 10);
      const y = new Date().getFullYear();
      if (month && day && isValidDate(y, month, day)) {
        queryDateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  // 数字月+中文日: 5月八号有什么活动
  if (!queryDateStr) {
    const cnDayQuery = text.match(/(\d{1,2})月([一二三四五六七八九十廿三十]+)(?:日|号)?(?:都有|都)?(?:有没有|有)?(?:什么|啥)(?:事|活动|安排|任务|计划)?/);
    if (cnDayQuery) {
      const month = parseInt(cnDayQuery[1], 10);
      const day = cnNumToNumber(cnDayQuery[2]);
      const y = new Date().getFullYear();
      if (month && day && isValidDate(y, month, day)) {
        queryDateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  if (queryDateStr) {
    openSummaryModal('date:' + queryDateStr);
    return;
  }

  // "X月Y日...纪念一下/纪念纪念"（如 "六月十一上岸了，纪念一下"）
  const jinianMatch = text.match(/(\d{1,2}|[一二三四五六七八九十十一十二]+)月(\d{1,2}|[一二三四五六七八九十廿三十]+)(?:日|号)?(?:是)?(.+?)(?:纪念一下|纪念纪念|来纪念)/);
  if (jinianMatch) {
    let month = jinianMatch[1], day = jinianMatch[2];
    let monthNum = /^\d+$/.test(month) ? parseInt(month, 10) : cnNumToNumber(month);
    let dayNum = /^\d+$/.test(day) ? parseInt(day, 10) : cnNumToNumber(day);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const monthDay = `${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      let name = jinianMatch[3].replace(/^[是的了]+/, '').replace(/[了，,。]+$/, '').trim();
      if (!name) name = '纪念日';
      addMemorialDay(name, monthDay, guessMemorialIcon(name), text);
      return;
    }
  }

  // 添加纪念日（动词前缀）: "记住5月20日结婚纪念日"
  const memorialMatch = text.match(/(记住|添加|设置)(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)(?:是)?(.*?)(生日|纪念日)/);
  if (memorialMatch) {
    const month = memorialMatch[3].padStart(2, '0');
    const day = memorialMatch[4].padStart(2, '0');
    const suffix = memorialMatch[6];
    const name = ((memorialMatch[5] || '') + suffix).trim();
    addMemorialDay(name, `${month}-${day}`, guessMemorialIcon(name), text);
    return;
  }

  // 添加纪念日（农历）
  if (text.includes('农历') && (text.includes('记住') || text.includes('添加') || text.includes('设置')) && (text.includes('生日') || text.includes('纪念日'))) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      const suffix = text.includes('生日') ? '生日' : '纪念日';
      const namePart = text.replace(/记住|添加|设置/, '').replace(/(?:\d{4}年)?农历(?:的)?[正一二三四五六七八九十冬腊]+月初?[一二三四五六七八九十廿三十]+/, '').trim();
      const name = (namePart || suffix).replace(/^的/, '').trim();
      addMemorialDay(name, lunarInfo.monthDay, guessMemorialIcon(name), text);
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
    addMemorialDay(name, `${month}-${day}`, guessMemorialIcon(name), text);
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
  const nextWeekMatch = text.match(/下(周一|周二|周三|周四|周五|周六|周日|周天|[一二三四五六日天])/);
  if (nextWeekMatch) {
    const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0, '周天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const today = new Date();
    let daysToAdd = weekMap[nextWeekMatch[1]] - today.getDay();
    if (daysToAdd <= 0) daysToAdd += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    dateStr = formatDate(nextDate);
    title = text.replace(/下[周一二三四五六日天]/, '').trim();
  }
  // 上周几
  else {
    const lastWeekMatch = text.match(/上(周一|周二|周三|周四|周五|周六|周日|周天|[一二三四五六日天])/);
    if (lastWeekMatch) {
      const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0, '周天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
      const today = new Date();
      let diff = weekMap[lastWeekMatch[1]] - today.getDay();
      const d = new Date(today); d.setDate(today.getDate() + diff - 7);
      dateStr = formatDate(d);
      title = text.replace(/上[周一二三四五六日天]/, '').trim();
    }
  }
  // 这周几 / 本周几
  if (!dateStr) {
    const thisWeekMatch = text.match(/(?:这周|本周)(周一|周二|周三|周四|周五|周六|周日|[一二三四五六日天])/);
    if (thisWeekMatch) {
      const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0, '周天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
      const today = new Date();
      const diff = weekMap[thisWeekMatch[1]] - today.getDay();
      const d = new Date(today); d.setDate(today.getDate() + diff);
      dateStr = formatDate(d);
      title = text.replace(/(?:这周|本周)[周一二三四五六日天]/, '').trim();
    }
  }
  // 独立周X / 星期X（默认本周）
  if (!dateStr) {
    const swMatch = text.match(/^(周[一二三四五六日天]|星期[一二三四五六日天])/);
    if (swMatch) {
      const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0, '周天': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 0, '星期天': 0 };
      const today = new Date();
      const diff = dayMap[swMatch[1]] - today.getDay();
      const d = new Date(today); d.setDate(today.getDate() + diff);
      dateStr = formatDate(d);
      title = text.replace(/^(?:周[一二三四五六日天]|星期[一二三四五六日天])/, '').trim();
    }
  }
  // 去年/今年/明年 X月X日
  if (!dateStr) {
    const yearDateMatch = text.match(/(去年|今年|明年)(\d{1,2})月(\d{1,2})(?:日|号)?/);
    if (yearDateMatch) {
      let y = new Date().getFullYear();
      if (yearDateMatch[1] === '去年') y -= 1;
      else if (yearDateMatch[1] === '明年') y += 1;
      dateStr = `${y}-${yearDateMatch[2].padStart(2, '0')}-${yearDateMatch[3].padStart(2, '0')}`;
      title = text.replace(/(?:去年|今年|明年)\d{1,2}月\d{1,2}(?:日|号)?/, '').trim();
    }
  }
  // 上月/上个月/本月/这个月/下月/下个月 X号
  if (!dateStr) {
    const monthMatch = text.match(/(上月|上个月|本月|这个月|下月|下个月)(\d{1,2})(?:日|号)?/);
    if (monthMatch) {
      const today = new Date();
      let y = today.getFullYear(), m = today.getMonth();
      if (monthMatch[1] === '上月' || monthMatch[1] === '上个月') m -= 1;
      else if (monthMatch[1] === '下月' || monthMatch[1] === '下个月') m += 1;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      const d = parseInt(monthMatch[2], 10);
      if (isValidDate(y, m + 1, d)) {
        dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        title = text.replace(/(?:上月|上个月|本月|这个月|下月|下个月)\d{1,2}(?:日|号)?/, '').trim();
      }
    }
  }
  // 上月/上个月/本月/这个月/下月/下个月 X号（中文数字）
  if (!dateStr) {
    const cnMonthMatch = text.match(/(上月|上个月|本月|这个月|下月|下个月)([一二三四五六七八九十廿三十]+)(?:日|号)?/);
    if (cnMonthMatch) {
      const today = new Date();
      let y = today.getFullYear(), m = today.getMonth();
      if (cnMonthMatch[1] === '上月' || cnMonthMatch[1] === '上个月') m -= 1;
      else if (cnMonthMatch[1] === '下月' || cnMonthMatch[1] === '下个月') m += 1;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      const d = cnNumToNumber(cnMonthMatch[2]);
      if (d && isValidDate(y, m + 1, d)) {
        dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        title = text.replace(cnMonthMatch[0], '').trim();
      }
    }
  }
  // 明天
  if (!dateStr && text.includes('明天')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = formatDate(tomorrow);
    title = text.replace(/明天/, '').trim();
  }
  // 今天
  if (!dateStr && text.includes('今天')) {
    dateStr = getTodayStr();
    title = text.replace(/今天/, '').trim();
  }
  // 后天
  if (!dateStr && text.includes('后天')) {
    const d = new Date(); d.setDate(d.getDate() + 2);
    dateStr = formatDate(d);
    title = text.replace(/后天/, '').trim();
  }
  // 昨天
  if (!dateStr && text.includes('昨天')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    dateStr = formatDate(d);
    title = text.replace(/昨天/, '').trim();
  }
  // 农历日期
  if (!dateStr && text.includes('农历')) {
    const lunarInfo = parseLunarDateFromText(text);
    if (lunarInfo) {
      dateStr = lunarInfo.dateStr;
      title = text.replace(/农历(?:的)?[正一二三四五六七八九十冬腊]+月初?[一二三四五六七八九十廿三十]+/, '').trim();
    }
  }
  // X月X日 / X月X号（数字）
  if (!dateStr) {
    const dateMatch = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})(?:日|号)?/);
    if (dateMatch) {
      const year = dateMatch[1] || currentYear;
      dateStr = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      title = text.replace(/(?:\d{4}年)?\d{1,2}月\d{1,2}(?:日|号)?/, '').trim();
    }
  }
  // X月X号（中文数字），如 "六月十一"
  if (!dateStr) {
    const cnMatch = text.match(/(?:(\d{4})年)?([一二三四五六七八九十十一十二]+)月([一二三四五六七八九十廿三十]+)(?:日|号)?/);
    if (cnMatch) {
      const month = cnNumToNumber(cnMatch[2]);
      const day = cnNumToNumber(cnMatch[3]);
      if (month && day) {
        const year = cnMatch[1] || currentYear;
        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        title = text.replace(cnMatch[0], '').trim();
      }
    }
  }
  // 中文月 + 数字日，如 "四月3号"
  if (!dateStr) {
    const cnMatch = text.match(/(?:(\d{4})年)?([一二三四五六七八九十十一十二]+)月(\d{1,2})(?:日|号)?/);
    if (cnMatch) {
      const month = cnNumToNumber(cnMatch[2]);
      const day = parseInt(cnMatch[3], 10);
      if (month && day) {
        const year = cnMatch[1] || currentYear;
        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        title = text.replace(cnMatch[0], '').trim();
      }
    }
  }
  // 数字月 + 中文日，如 "4月三号"
  if (!dateStr) {
    const cnMatch = text.match(/(?:(\d{4})年)?(\d{1,2})月([一二三四五六七八九十廿三十]+)(?:日|号)?/);
    if (cnMatch) {
      const month = parseInt(cnMatch[2], 10);
      const day = cnNumToNumber(cnMatch[3]);
      if (month && day) {
        const year = cnMatch[1] || currentYear;
        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        title = text.replace(cnMatch[0], '').trim();
      }
    }
  }

  if (dateStr && title) {
    if (title === '' || title === '明天') title = "提醒事项";
    if (/纪念|生日/.test(text)) {
      title = title.replace(/[，,。]?(?:纪念一下|纪念纪念|来纪念)/, '').trim();
      title = title.replace(/[，,。]?(?:快乐|开心|幸福|喜悦|愉悦|美满|甜蜜)/, '').trim();
      const monthDay = dateStr.split('-').slice(1).join('-');
      addMemorialDay(title.replace(/^是/, '').trim(), monthDay, guessMemorialIcon(title), text);
    } else {
      title = title.replace(/[，,。]?(?:纪念一下|纪念纪念|来纪念)/, '').trim();
      addEvent(title, dateStr, '', text);
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

  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', openHelpModal);
  }

  const speakSummaryBtn = document.getElementById('speakSummaryBtn');
  if (speakSummaryBtn) {
    speakSummaryBtn.addEventListener('click', speakSummaryContent);
  }

  // 图标选择（表单）
  document.querySelectorAll('.icon-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIconForMemorial = btn.dataset.icon;
    });
  });

  // 图标选择（弹窗）
  document.querySelectorAll('#memorialModal .icon-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#memorialModal .icon-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMemorialEditIcon = btn.dataset.icon;
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

  // 添加事件按钮
  const addEventBtn = document.getElementById('addEventBtn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', openEventModalForAdd);
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
    if (e.key === 'Escape') { closeModal(); closeMemorialModal(); closeHelpModal(); closeSummaryModal(); }
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

  // 上周几
  match = text.match(/上(周一|周二|周三|周四|周五|周六|周日)/);
  if (match) {
    const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 };
    const today = new Date();
    let diff = weekMap[match[1]] - today.getDay();
    const d = new Date(today); d.setDate(today.getDate() + diff - 7);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/上[周一二三四五六日]/, '').replace(/^的/, '').trim() };
  }

  // 这周几 / 本周几
  match = text.match(/(?:这周|本周)(周一|周二|周三|周四|周五|周六|周日)/);
  if (match) {
    const weekMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 };
    const today = new Date();
    const diff = weekMap[match[1]] - today.getDay();
    const d = new Date(today); d.setDate(today.getDate() + diff);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/(?:这周|本周)[周一二三四五六日]/, '').replace(/^的/, '').trim() };
  }

  // 去年/今年/明年 X月X日
  match = text.match(/(去年|今年|明年)(\d{1,2})月(\d{1,2})(?:日|号)?/);
  if (match) {
    let y = new Date().getFullYear();
    if (match[1] === '去年') y -= 1;
    else if (match[1] === '明年') y += 1;
    const dateStr = `${y}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    return { dateStr, rest: text.replace(/(?:去年|今年|明年)\d{1,2}月\d{1,2}(?:日|号)?/, '').replace(/^的/, '').trim() };
  }

  // 上月/上个月/本月/这个月/下月/下个月 X号
  match = text.match(/(上月|上个月|本月|这个月|下月|下个月)(\d{1,2})(?:日|号)?/);
  if (match) {
    const today = new Date();
    let y = today.getFullYear(), m = today.getMonth();
    if (match[1] === '上月' || match[1] === '上个月') m -= 1;
    else if (match[1] === '下月' || match[1] === '下个月') m += 1;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    const d = parseInt(match[2], 10);
    if (isValidDate(y, m + 1, d)) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { dateStr, rest: text.replace(/(?:上月|上个月|本月|这个月|下月|下个月)\d{1,2}(?:日|号)?/, '').replace(/^的/, '').trim() };
    }
  }
  // 上月/上个月/本月/这个月/下月/下个月 X号（中文数字）
  match = text.match(/(上月|上个月|本月|这个月|下月|下个月)([一二三四五六七八九十廿三十]+)(?:日|号)?/);
  if (match) {
    const today = new Date();
    let y = today.getFullYear(), m = today.getMonth();
    if (match[1] === '上月' || match[1] === '上个月') m -= 1;
    else if (match[1] === '下月' || match[1] === '下个月') m += 1;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    const d = cnNumToNumber(match[2]);
    if (d && isValidDate(y, m + 1, d)) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { dateStr, rest: text.replace(match[0], '').replace(/^的/, '').trim() };
    }
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
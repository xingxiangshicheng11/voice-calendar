console.log('语音日历助手 - 项目已启动');

// 获取DOM元素
const monthYearDisplay = document.getElementById('monthYear');
const calendarDays = document.getElementById('calendarDays');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');

// 临时数据
let currentYear = 2026;
let currentMonth = 4; // 5月 (0-indexed)

// 简单渲染日历格子
function renderSimpleCalendar() {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  monthYearDisplay.innerText = `${currentYear}年${currentMonth + 1}月`;

  let html = '';
  for (let i = 1; i <= daysInMonth; i++) {
    html += `<div class="day-cell">${i}</div>`;
  }
  calendarDays.innerHTML = html;
}

// 月份切换
prevBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderSimpleCalendar();
});

nextBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderSimpleCalendar();
});

// 初始化
renderSimpleCalendar();
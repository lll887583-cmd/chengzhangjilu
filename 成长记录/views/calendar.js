import { POINT_RULES } from '../data.js';

const STUDY_RULE_NAMES = POINT_RULES
  .filter(rule => rule[3] === 'study' || ['学习汉字', '学习数学', '完成学校作业', '打卡英语', '练字'].includes(rule[0]))
  .map(rule => rule[0]);

function isStudyRecord(record) {
  if (record.category === 'study') return true;
  if ((record.delta || 0) <= 0) return false;
  return STUDY_RULE_NAMES.some(name => record.text.includes(name));
}

function isEnglishCheckinRecord(record) {
  if ((record.delta || 0) <= 0) return false;
  return record.text.includes('打卡英语');
}

function dayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthTitle(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

export function calendarView(state) {
  const monthBase = state.calendarMonth ? new Date(`${state.calendarMonth}T00:00:00`) : new Date();
  const year = monthBase.getFullYear();
  const month = monthBase.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const studyDays = new Set((state.records || []).filter(isStudyRecord).map(record => dayKey(record.time)));
  const englishCheckinDays = new Set((state.records || []).filter(isEnglishCheckinRecord).map(record => dayKey(record.time)));
  const cells = [];

  for (let i = 0; i < leading; i += 1) cells.push('<span class="calendar-cell muted"></span>');
  for (let day = 1; day <= totalDays; day += 1) {
    const key = `${year}-${month}-${day}`;
    const weekdayIndex = (leading + day - 1) % 7;
    const isWeekend = weekdayIndex >= 5;
    const isToday = dayKey(Date.now()) === key;
    const hasStudy = studyDays.has(key);
    const hasEnglishCheckin = englishCheckinDays.has(key);
    const dots = [
      hasStudy ? '<i class="study-dot" aria-label="学习行为"></i>' : '',
      hasEnglishCheckin ? '<i class="english-dot" aria-label="打卡英语"></i>' : ''
    ].filter(Boolean).join('');
    cells.push(`
      <button class="calendar-cell ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'today' : ''} ${hasStudy ? 'has-study' : ''} ${hasEnglishCheckin ? 'has-english-checkin' : ''}" data-speak="${month + 1}月${day}日${hasStudy ? '有学习记录' : '暂无学习记录'}${hasEnglishCheckin ? '，检测到打卡英语' : ''}">
        <strong>${day}</strong>
        ${dots ? `<span class="calendar-dots">${dots}</span>` : ''}
      </button>`);
  }
  while (cells.length % 7 !== 0) cells.push('<span class="calendar-cell muted"></span>');

  return `
    <section class="calendar-page">
      <section class="card calendar-card">
        <div class="calendar-weekdays">${['一', '二', '三', '四', '五', '六', '日'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="calendar-grid">${cells.join('')}</div>
        <p class="calendar-legend">
          <span class="study-dot"></span> 蓝色圆点代表当天有学习行为
          <span class="english-dot"></span> 粉色圆点代表检测到打卡英语
        </p>
      </section>
    </section>`;
}

import { useState, useMemo } from 'react';
import {
  AFGHAN_MONTHS,
  AFGHAN_WEEKDAYS,
  CALENDAR_COLORS,
  afghanToGregorianDate,
  formatAfghanDate,
  getAfghanMonthLength,
  getCalendarLevel,
  getSaturdayFirstDayIndex,
} from '../constants';

const DAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export default function ContributionCalendar({ data, year, onSelectDay }) {
  const [tooltip, setTooltip] = useState(null);

  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];

    const firstDate = afghanToGregorianDate(year, 1, 1);
    const startDay = getSaturdayFirstDayIndex(firstDate);
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    let gregorianDate = firstDate;
    for (let month = 1; month <= 12; month += 1) {
      const monthLength = month <= 6 ? 31 : month <= 11 ? 30 : getAfghanMonthLength(year, month);
      for (let day = 1; day <= monthLength; day += 1) {
        const dateStr = gregorianDate;
        const dayData = data[dateStr];
        currentWeek.push({
          date: dateStr,
          displayDate: formatAfghanDate(dateStr, { includeYear: true }),
          afghanMonth: month,
          afghanDay: day,
          hours: dayData?.hours || 0,
          technologies: dayData?.technologies || '',
          level: getCalendarLevel(dayData?.hours || 0),
        });

        if (currentWeek.length === 7) {
          result.push(currentWeek);
          currentWeek = [];
        }
        const current = new Date(`${gregorianDate}T00:00:00Z`);
        current.setUTCDate(current.getUTCDate() + 1);
        gregorianDate = current.toISOString().slice(0, 10);
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      result.push(currentWeek);
    }

    return result;
  }, [data, year]);

  const getColor = (level) => {
    return CALENDAR_COLORS[level] || CALENDAR_COLORS.none;
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px] min-w-max">
        {/* Month labels */}
        <div className="flex flex-col mr-1">
          <div className="h-4" />
          {DAY_LABELS.map((d, i) => (
            <div key={d} title={AFGHAN_WEEKDAYS[i]} className="h-[11px] text-[10px] text-text-muted leading-[11px] my-[1px]">
              {d}
            </div>
          ))}
        </div>

        <div>
          <div className="flex gap-[3px] mb-1 h-4">
            {weeks.map((week, wi) => {
              const monthStart = week.find(d => d?.afghanDay === 1) || (wi === 0 ? week.find(d => d) : null);
              return (
                <div key={wi} className="w-[11px] text-[10px] text-text-muted">
                  {monthStart ? AFGHAN_MONTHS[monthStart.afghanMonth - 1] : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-[11px] h-[11px] rounded-sm transition-all duration-150 hover:ring-1 hover:ring-primary/50 cursor-pointer"
                    style={{ backgroundColor: day ? getColor(day.level) : 'transparent' }}
                    onClick={() => day && onSelectDay?.(day)}
                    onMouseEnter={(e) => day && setTooltip({ ...day, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
        <span>Less</span>
        {['none', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6'].map(l => (
          <div key={l} className="w-[11px] h-[11px] rounded-sm" style={{ backgroundColor: CALENDAR_COLORS[l] }} />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 glass rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-semibold">{tooltip.hours.toFixed(1)} hours on {tooltip.displayDate}</p>
          {tooltip.technologies && <p className="text-text-muted mt-0.5">{tooltip.technologies}</p>}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';
import {
  CALENDAR_OPTIONS,
  CALENDAR_TYPES,
  getGlobalCalendarType,
  setGlobalCalendarType,
  formatDate as formatWithCalendar,
  formatMonth as formatMonthWithCalendar,
  getCurrentYear as getYearWithCalendar,
  getMonthNames as getMonthNamesWithCalendar,
  getWeekdayNames as getWeekdayNamesWithCalendar,
  getShortMonthNames as getShortMonthNamesWithCalendar,
  getShortWeekdayNames as getShortWeekdayNamesWithCalendar,
  getMonthLength as getMonthLengthWithCalendar,
} from '../constants';
import { CalendarContext } from './CalendarContextStore';

export function CalendarProvider({ children }) {
  const [calendar, setCalendarState] = useState(getGlobalCalendarType);

  useEffect(() => {
    const handleCalendarChanged = (e) => {
      const newCal = e.detail;
      if (newCal && ['afghan', 'iranian', 'gregorian'].includes(newCal)) {
        setCalendarState(newCal);
      }
    };
    window.addEventListener('devtracker-calendar-changed', handleCalendarChanged);
    return () => window.removeEventListener('devtracker-calendar-changed', handleCalendarChanged);
  }, []);

  const setCalendar = useCallback(async (type) => {
    if (!['afghan', 'iranian', 'gregorian'].includes(type)) return;
    setCalendarState(type);
    setGlobalCalendarType(type);
    try {
      await userApi.updateSettings({ calendar_type: type });
    } catch {
      // Preference safely kept in localStorage
    }
  }, []);

  useEffect(() => {
    userApi.getProfile().then(res => {
      if (res.data?.calendar_type && ['afghan', 'iranian', 'gregorian'].includes(res.data.calendar_type)) {
        setCalendarState(res.data.calendar_type);
        setGlobalCalendarType(res.data.calendar_type);
      }
    }).catch(() => {});
  }, []);

  const formatDate = useCallback((val, opts) => (
    formatWithCalendar(val, { calendar, ...opts })
  ), [calendar]);

  const formatMonth = useCallback((year, month, opts) => (
    formatMonthWithCalendar(year, month, { calendar, ...opts })
  ), [calendar]);

  const getCurrentYear = useCallback((val) => (
    getYearWithCalendar(val, calendar)
  ), [calendar]);

  const getMonthNames = useCallback(() => (
    getMonthNamesWithCalendar(calendar)
  ), [calendar]);

  const getShortMonthNames = useCallback(() => (
    getShortMonthNamesWithCalendar(calendar)
  ), [calendar]);

  const getWeekdayNames = useCallback(() => (
    getWeekdayNamesWithCalendar(calendar)
  ), [calendar]);

  const getShortWeekdayNames = useCallback(() => (
    getShortWeekdayNamesWithCalendar(calendar)
  ), [calendar]);

  const getMonthLength = useCallback((year, month) => (
    getMonthLengthWithCalendar(year, month, calendar)
  ), [calendar]);

  return (
    <CalendarContext.Provider value={{
      calendar,
      setCalendar,
      calendarOptions: CALENDAR_OPTIONS,
      calendarTypes: CALENDAR_TYPES,
      formatDate,
      formatMonth,
      getCurrentYear,
      getMonthNames,
      getShortMonthNames,
      getWeekdayNames,
      getShortWeekdayNames,
      getMonthLength,
      isAfghan: calendar === 'afghan',
      isIranian: calendar === 'iranian',
      isGregorian: calendar === 'gregorian',
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

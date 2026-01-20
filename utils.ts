import { format, isWeekend } from 'date-fns';
import { Resource, OverrideValue } from './types';
import { HOLIDAYS } from './constants';

export interface DayStatus {
  val: number;
  defaultVal: number;
  isHoliday: boolean;
  isWknd: boolean;
  overrideActive: boolean;
  isOutOfBounds: boolean;
}

/**
 * Calculates the presence value and status for a specific resource on a given date.
 * This ensures consistency between the Dashboard calculation and the Calendar view.
 */
export function calculateDayStatus(date: Date, resource: Resource): DayStatus {
  const dateStr = format(date, 'yyyy-MM-dd');

  const start = resource.startDate || '0000-00-00';
  const end = resource.endDate || '9999-12-31';
  
  const isOutOfBounds = dateStr < start || dateStr > end;

  // Combine standard and dynamic holidays
  const countryHolidays = HOLIDAYS[resource.country] || [];
  const dynamicHolidays = resource.dynamicHolidays || [];
  const allHolidays = [...new Set([...countryHolidays, ...dynamicHolidays])];
  
  const isHoliday = allHolidays.includes(dateStr);
  const isWknd = isWeekend(date);

  const defaultVal = (isHoliday || isWknd) ? 0 : 1;

  const override = resource.overrides[dateStr];
  const overrideActive = override !== undefined;
  
  let val = overrideActive ? override : defaultVal;
  
  if (isOutOfBounds) {
      val = 0;
  }

  return {
    val: val as number,
    defaultVal,
    isHoliday,
    isWknd,
    overrideActive,
    isOutOfBounds
  };
}

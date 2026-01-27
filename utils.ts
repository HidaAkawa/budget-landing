import { format, isWeekend, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns';
import { Resource, OverrideValue } from '@/types';
import { HOLIDAYS } from '@/constants';

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

/**
 * CACHE for yearly stats to avoid re-calculating thousands of times per render.
 * Key: resourceId-year-updatedAt(timestamp or simple check)
 * Since we don't have a granular "updatedAt" per resource in the frontend list easily,
 * we will memoize based on the resource object reference in React, but here we can provide the heavy function.
 */
export function calculateYearlyStats(resource: Resource, year: number) {
    let totalDays = 0;
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(start);
    const days = eachDayOfInterval({ start, end });
    
    // We can optimize this loop by not calling calculateDayStatus which formats dates repeatedly
    // But calculateDayStatus is the source of truth.
    // Optimization: Pre-calculate boundaries and holidays.

    const resStart = resource.startDate || `${year}-01-01`;
    const resEnd = resource.endDate || `${year}-12-31`;
    const countryHolidays = new Set([...(HOLIDAYS[resource.country] || []), ...(resource.dynamicHolidays || [])]);

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        // 1. Bounds Check (String comparison is fast enough)
        if (dateStr < resStart || dateStr > resEnd) return;

        // 2. Override Check (Fastest)
        if (resource.overrides[dateStr] !== undefined) {
            totalDays += resource.overrides[dateStr];
            return;
        }

        // 3. Holiday/Weekend Check
        // We use Set for O(1) holiday lookup instead of Array.includes O(N)
        if (countryHolidays.has(dateStr)) return;
        if (isWeekend(day)) return;

        // Default
        totalDays += 1;
    });

    return {
        days: totalDays,
        cost: totalDays * resource.tjm
    };
}

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

  // Check bounds (Contract duration)
  // If startDate/endDate are empty/null, we assume indefinite or handle elsewhere, 
  // but based on types they are strings. Let's assume they are mandatory or check existence.
  const start = resource.startDate || '0000-00-00';
  const end = resource.endDate || '9999-12-31';
  
  const isOutOfBounds = dateStr < start || dateStr > end;

  // Determine standard holidays
  const countryHolidays = HOLIDAYS[resource.country] || [];
  const isHoliday = countryHolidays.includes(dateStr);
  const isWknd = isWeekend(date);

  // Default value: 0 if holiday or weekend, else 1
  const defaultVal = (isHoliday || isWknd) ? 0 : 1;

  // Check for overrides
  const override = resource.overrides[dateStr];
  const overrideActive = override !== undefined;
  
  // Final value: Override takes precedence, otherwise default
  // If out of bounds, value is effectively 0 for calculations, 
  // but strictly speaking the logic usually returns the day state 
  // and the consumer decides if "out of bounds" means 0.
  // Here, we'll return the calculated value "as if" they were employed, 
  // but the 'isOutOfBounds' flag allows the caller to zero it out.
  // HOWEVER: To be safe and easy to use, let's return val = 0 if outOfBounds.
  
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

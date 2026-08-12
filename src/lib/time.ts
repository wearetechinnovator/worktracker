/**
 * Converts a time string "HH:MM" to total minutes from start of day
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Calculates actual elapsed time in minutes between a start and end time.
 * Supports overnight shifts if the end time is less than the start time.
 */
export function calculateElapsedMinutes(startTime: string, endTime: string): number {
  const startMins = timeStringToMinutes(startTime);
  const endMins = timeStringToMinutes(endTime);
  
  let diff = endMins - startMins;
  if (diff < 0) {
    // Overnight shift: add 24 hours in minutes
    diff += 24 * 60;
  }
  return diff;
}

/**
 * Formats minutes into a readable duration string, e.g., "3h 45m" or "30m"
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes < 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Formats minutes into decimal hours, e.g., 2.5
 */
export function formatMinutesToDecimalHours(totalMinutes: number): number {
  if (totalMinutes <= 0) return 0;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Formats a Date object to "YYYY-MM-DD"
 */
export function formatLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a local target time to another timezone.
 * Uses IANA timezone identifiers (e.g., "America/New_York", "Asia/Jerusalem", "Asia/Karachi")
 *
 * @param localTime - Time in "HH:MM" format
 * @param localDate - Date in "YYYY-MM-DD" format
 * @param fromTz - Source IANA timezone
 * @param toTz - Target IANA timezone
 * @returns Converted time in "HH:MM" format with next-day indicator if applicable
 */
export function convertTime(
  localTime: string,
  localDate: string,
  fromTz: string,
  toTz: string
): string {
  const [hours, minutes] = localTime.split(':').map(Number);

  // Create a date in the source timezone
  const dateStr = `${localDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Get UTC offset for source timezone
  const sourceDate = new Date(dateStr);
  const sourceFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Use a reference point approach: find the UTC time that corresponds to the given local time
  // Try the date as-is first
  const testDate = new Date(`${localDate}T12:00:00Z`);

  // Get the offset for the source timezone
  const sourceParts = sourceFormatter.formatToParts(testDate);
  const targetParts = targetFormatter.formatToParts(testDate);

  // Calculate using Intl API more directly
  const utcDate = new Date(Date.UTC(
    parseInt(localDate.split('-')[0]),
    parseInt(localDate.split('-')[1]) - 1,
    parseInt(localDate.split('-')[2]),
    hours,
    minutes
  ));

  // Get source timezone offset
  const sourceOffset = getTimezoneOffset(fromTz, utcDate);
  const targetOffset = getTimezoneOffset(toTz, utcDate);

  // Calculate the actual UTC time from the local time
  const utcMs = utcDate.getTime() - sourceOffset * 60000;
  // Convert to target timezone
  const targetMs = utcMs + targetOffset * 60000;
  const targetDate = new Date(targetMs);

  const targetHours = targetDate.getUTCHours();
  const targetMinutes = targetDate.getUTCMinutes();
  const targetDay = targetDate.getUTCDate();
  const sourceDay = parseInt(localDate.split('-')[2]);

  const timeStr = `${String(targetHours).padStart(2, '0')}:${String(targetMinutes).padStart(2, '0')}`;

  if (targetDay !== sourceDay) {
    const diff = targetDay - sourceDay;
    if (diff > 0 || diff < -25) {
      return `${timeStr} (+1d)`;
    } else if (diff < 0 || diff > 25) {
      return `${timeStr} (-1d)`;
    }
  }

  return timeStr;
}

function getTimezoneOffset(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

/**
 * Check if a time falls within optimal send windows
 * Optimal: 8-9am, 10am-12pm, 5-7pm
 */
export function isOptimalTime(time: string): 'optimal' | 'good' | 'neutral' {
  const [hours] = time.split(':').map(Number);
  if ((hours >= 8 && hours < 9) || (hours >= 10 && hours < 12) || (hours >= 17 && hours < 19)) {
    return 'optimal';
  }
  if ((hours >= 9 && hours < 10) || (hours >= 12 && hours < 14) || (hours >= 16 && hours < 17)) {
    return 'good';
  }
  return 'neutral';
}

/**
 * Get common timezone options
 */
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Asia/Jerusalem', label: 'Israel (IDT)' },
  { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Asia/Manila', label: 'Philippines (PHT)' },
];

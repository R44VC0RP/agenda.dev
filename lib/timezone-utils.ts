/**
 * Gets the browser's timezone using the Intl API
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect browser timezone:', error);
    return 'UTC';
  }
}

/**
 * Adds the browser's timezone to the headers of a fetch request
 */
export function addTimezoneHeader(headers: HeadersInit = {}): HeadersInit {
  const timezone = getBrowserTimezone();
  return {
    ...headers,
    'x-timezone': timezone,
  };
}

/**
 * Formats a date in the user's timezone
 */
export function formatInTimezone(date: Date | string, timezone: string = 'UTC'): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    timeZone: timezone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

/**
 * Converts a date from one timezone to another
 */
export function convertTimezone(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): Date {
  const d = new Date(date);
  const fromOffset = getTimezoneOffset(d, fromTimezone);
  const toOffset = getTimezoneOffset(d, toTimezone);
  const diffMinutes = fromOffset - toOffset;

  return new Date(d.getTime() + diffMinutes * 60 * 1000);
}

/**
 * Gets the timezone offset in minutes for a specific date and timezone
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / (60 * 1000);
}

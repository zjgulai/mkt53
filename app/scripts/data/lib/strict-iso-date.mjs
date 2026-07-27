const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidIsoCalendarDate(value) {
  if (!isNonEmptyString(value)) return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTimezoneIsoDateTime(value) {
  if (!isNonEmptyString(value)) return false;
  const match = ISO_DATE_TIME_PATTERN.exec(value);
  if (!match || !isValidIsoCalendarDate(value.slice(0, 10))) return false;

  const [, , , , hourText, minuteText, secondText] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  return hour <= 23 && minute <= 59 && second <= 59 && !Number.isNaN(Date.parse(value));
}

export function isValidIsoDateOrDateTime(value) {
  return isValidIsoCalendarDate(value) || isValidTimezoneIsoDateTime(value);
}

export function getKstHour(now: Date = new Date()): number {
  const kstOffset = 9 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kstMinutes = utcMinutes + kstOffset;
  return Math.floor(kstMinutes / 60) % 24;
}

export function getKstMinute(now: Date = new Date()): number {
  const kstOffset = 9 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kstMinutes = utcMinutes + kstOffset;
  return kstMinutes % 60;
}

export function isOrderExecutionTime(now: Date = new Date()): boolean {
  const hour = getKstHour(now);
  const minute = getKstMinute(now);
  const totalMinutes = hour * 60 + minute;
  // KST 09:10 ~ 15:00
  return totalMinutes >= 9 * 60 + 10 && totalMinutes <= 15 * 60;
}

export function isFillCheckTime(now: Date = new Date()): boolean {
  const hour = getKstHour(now);
  const minute = getKstMinute(now);
  const totalMinutes = hour * 60 + minute;
  // KST 09:00 ~ 15:00
  return totalMinutes >= 9 * 60 && totalMinutes <= 15 * 60;
}

export function getTodayKst(now: Date = new Date()): string {
  const kstOffset = 9 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kstMinutes = utcMinutes + kstOffset;

  const kstDate = new Date(now);
  kstDate.setUTCHours(0, 0, 0, 0);
  kstDate.setUTCMinutes(kstDate.getUTCMinutes() + kstMinutes);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

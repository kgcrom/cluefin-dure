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

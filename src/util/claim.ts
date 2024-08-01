function get_reset_time(last_claim_date: Date): number {
  const reset_date = new Date(last_claim_date);
  reset_date.setHours(20);
  reset_date.setMinutes(0);
  reset_date.setSeconds(0);
  let time = reset_date.getTime();
  if (time < last_claim_date.getTime()) time += 86400000;
  return time;
}

export function can_claim(last_claim_date: Date): boolean {
  const now = Date.now();
  const last = last_claim_date.getTime();
  const reset = get_reset_time(last_claim_date);
  return (reset < now && last < reset) || now - last > 86400000;
}
export function claim_in_ms(last_claim_date: Date): number {
  if (can_claim(last_claim_date)) return 0;
  const now = Date.now();
  const last = last_claim_date.getTime();
  const reset = get_reset_time(last_claim_date);
  if (reset < last) return reset + 86400000 - now;
  return reset - now;
}
export function claim_in_formatted(last_claim_date: Date): string {
  const ms = claim_in_ms(last_claim_date);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

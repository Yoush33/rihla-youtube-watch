const durationNumber = new Intl.NumberFormat('ar-SA', {maximumFractionDigits:0});

function countedUnit(count:number, singular:string, dual:string, plural:string) {
  if (count === 1) return singular;
  if (count === 2) return dual;
  return durationNumber.format(count) + ' ' + (count >= 3 && count <= 10 ? plural : singular);
}

export function formatArabicDuration(minutes:number) {
  if (!Number.isFinite(minutes) || minutes < 0) return 'المدة تحتاج تحقق';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  const parts = [
    hours > 0 && countedUnit(hours,'ساعة','ساعتان','ساعات'),
    (remainder > 0 || hours === 0) && countedUnit(remainder,'دقيقة','دقيقتان','دقائق'),
  ].filter(Boolean);
  return parts.join(' و');
}

export const formatArabicHours = (hours:number) => formatArabicDuration(hours * 60);

export function formatWalkingMinutes(value:string) {
  const normalized = value.trim().replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0) - (digit <= '٩' ? 1632 : 1776)));
  const match = normalized.match(/^(?:(حوالي|نحو|ضمن)\s+)?(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!match) return value;
  const [, qualifier, start, end] = match;
  const formatted = end ? durationNumber.format(Number(start)) + ' إلى ' + countedUnit(Number(end),'دقيقة','دقيقتان','دقائق')
    : countedUnit(Number(start),'دقيقة','دقيقتان','دقائق');
  return [qualifier,formatted].filter(Boolean).join(' ');
}

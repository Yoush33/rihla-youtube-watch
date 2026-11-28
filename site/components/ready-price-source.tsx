import type {ReadyPrice} from '../lib/ready-plan-schema';
import {dateText} from '../lib/trip-card';

export function ReadyPriceSource({price}: {price:ReadyPrice}) {
  return <small className="ready-price-source">
    {price.url ? <a href={price.url} target="_blank" rel="noreferrer">{price.source}</a> : price.source}
    {' · '}{price.checked_date ? 'الفحص ' + dateText(price.checked_date) : 'تاريخ الفحص غير مسجّل'}
    {price.amount !== null && price.estimated && !/تقدير/u.test(price.source) && ' · تقديري'}
  </small>;
}

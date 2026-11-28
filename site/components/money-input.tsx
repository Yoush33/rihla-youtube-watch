'use client';
import {useId,useState} from 'react';
import {moneyDigits,validMoneyInput} from '../lib/money';
export function MoneyInput({value,currency,onChange,label,placeholder}:{value:string;currency:string;onChange:(v:string)=>void;label:string;placeholder?:string}){
 const [error,setError]=useState(''),id=useId(),storedInvalid=value!==''&&!validMoneyInput(value,currency);
 return <span className="money-field"><input type="text" inputMode="decimal" dir="ltr" aria-label={label} aria-invalid={!!error||storedInvalid} aria-describedby={error||storedInvalid?id:undefined} value={value} placeholder={placeholder} onChange={e=>{const v=e.target.value.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/٫/g,'.');if(validMoneyInput(v,currency)){setError('');onChange(v);}else setError('أدخل مبلغًا موجبًا بدقة '+moneyDigits(currency)+' منازل عشرية لعملة '+(currency||'الرحلة')+'.');}}/>{(error||storedInvalid)&&<small id={id} role="status" className="error">{error||'القيمة القديمة محفوظة؛ راجع دقتها لتناسب العملة دون تقريبها تلقائيًا.'}</small>}</span>;
}

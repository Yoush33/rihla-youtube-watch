export function moneyDigits(currency:string){return currency==='JPY'?0:currency==='KWD'?3:2;}
export function validMoneyInput(value:string,currency:string){
 if(value==='')return true;
 const digits=moneyDigits(currency),pattern=digits?new RegExp('^\\d+(\\.\\d{0,'+digits+'})?$'):/^\d+$/;
 return value.length<=20&&pattern.test(value)&&Number(value)<=1e9;
}
export function minorAmount(value:string,currency:string){
 if(!currency||!value||!validMoneyInput(value,currency))return null;
 const scaled=Number(value)*10**moneyDigits(currency),rounded=Math.round(scaled);
 return Math.abs(scaled-rounded)<.00001?rounded:null;
}
export function exactActivityRate(amounts:string[],currency:string,days:number,travelers:number){
 if(!amounts.length||![days,travelers].every(n=>Number.isInteger(n)&&n>=1&&n<=30))throw Error('أكمل الأيام والمسافرين وتسعير جميع الأنشطة أولًا.');
 const values=amounts.map(v=>minorAmount(v,currency));
 if(values.some(v=>v===null))throw Error('أكمل تكاليف الأنشطة بدقة عملة الرحلة.');
 const total=values.reduce<number>((sum,v)=>sum+(v||0),0),factor=days*travelers;
 if(total%factor!==0)throw Error('لا يمكن توزيع هذا المجموع على الأيام والمسافرين بدقة العملة دون تغيير قيمته. بقي تقديرك كما هو؛ يمكنك تسجيل المجموع كرسم إضافي للمجموعة مع جعل بند الأنشطة اليومي صفرًا لتجنب تكراره.');
 return (total/factor/10**moneyDigits(currency)).toFixed(moneyDigits(currency));
}
export function formatMoney(value:number,currency:string){return new Intl.NumberFormat('ar',{maximumFractionDigits:moneyDigits(currency)}).format(value);}

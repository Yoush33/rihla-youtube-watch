import {localEvidence,type LocalTurn} from './browser-advisor';
import {communityLabel,type KnowledgeCard} from './knowledge';
import type {Trip} from './planning';
import {nationalityCode} from './reliability';

/** A transparent extract, not generated prose or an eligibility decision. */
export function libraryChatAnswer(t:Trip,country:string,cards:KnowledgeCard[]):Pick<LocalTurn,'answer'|'sources'>{
 const available=cards.filter(c=>c.code===country&&!c.archived),unknownPassport=available.some(c=>c.topic==='visa')&&nationalityCode(t)!=='SA';
 const refs=available.filter(c=>c.topic!=='visa'||!unknownPassport).slice(0,3);
 const intro='من مراجع رِحلة المحفوظة — مقتطفات مطابقة للسؤال، دون توليد نص أو بحث مباشر.';
 const entryNote=unknownPassport?'لم نطبق مراجع الجواز السعودي على رحلتك؛ الجنسية غير محددة أو مختلفة. تحقق من الجهة الرسمية بحسب جوازك.':refs.some(c=>c.topic==='visa')?'مرجع للدخول، وليس تأكيد أهلية: طابق الجنسية ونوع الجواز والغرض والمدة وتاريخ السفر مع الجهة الرسمية.':'';
 if(!refs.length&&!unknownPassport)throw Error('لا توجد مراجع مطابقة لهذا السؤال؛ جرّب ذكر المدينة والمكان أو الموضوع بوضوح.');
 return {answer:[intro,entryNote,...refs.map((c,i)=>'['+(i+1)+'] '+c.title+'\n'+(communityLabel(c)||(c.status==='editorial'?'تقدير أو اقتراح تحريري':c.status==='personal'?'ملاحظة شخصية غير متحققة':c.status==='historical'?'بيانات تاريخية':'مرجع محفوظ'))+' · مراجعة '+(c.checked||'غير مسجلة')+'\n'+localEvidence(c,t)+(c.text.length>600?'\nمقتطف؛ افتح المصدر لمراجعة السياق الكامل.':''))].filter(Boolean).join('\n\n'),sources:refs.map(c=>({title:c.title,url:c.source,checked:c.checked,text:localEvidence(c,t).slice(0,600)}))};
}

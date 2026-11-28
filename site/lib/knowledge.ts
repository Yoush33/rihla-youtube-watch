import {z} from 'zod';
import {videoEvidenceSchema,type VideoEvidence} from './video-evidence';
export const topics={overview:'نبذة ومدن',season:'أفضل وقت والمناخ',activities:'أنشطة وتجارب',transport:'النقل والسكن',food:'الطعام والعادات',visa:'التأشيرة',safety:'السلامة والصحة',budget:'التكلفة',holidays:'العطلات'};
export type Topic=keyof typeof topics;
export type KnowledgeCard={id:string;code:string;topic:Topic;title:string;text:string;source:string;checked:string;status:'reference'|'historical'|'editorial'|'personal';revision:number;archived:boolean;video?:VideoEvidence;city?:string;sourceName?:string;sourcePublished?:string;sourceKind?:'official'|'operator'|'media'|'community';communityKind?:'guide'|'experience';attribution?:{author:string;license?:string;licenseUrl?:string;historyUrl?:string;changes?:string};venueId?:string;venueNames?:string[];validFrom?:string|null;validUntil?:string|null;applicability?:string};
export const noteSchema=z.object({id:z.string().uuid(),code:z.string().regex(/^[A-Z]{2}$/),topic:z.enum(['overview','season','activities','transport','food','visa','safety','budget','holidays']),title:z.string().trim().min(3).max(150),text:z.string().trim().min(3).max(6000),source:z.union([z.literal(''),z.string().url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;})]),checked:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v<=new Date().toISOString().slice(0,10))]),revision:z.number().int().min(0),archived:z.boolean(),video:videoEvidenceSchema.optional()}).superRefine((v,c)=>{if(v.video&&(!v.source||!v.checked))c.addIssue({code:"custom",message:"أرفق المصدر وتاريخ المراجعة مع المرجع المرئي"});});
export const normalizeSearch=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي');
export function communityQueryKind(question:string):KnowledgeCard['communityKind']{
 const q=normalizeSearch(question);
 if(/ويكي\s?رحلات|ويكي\s?فوياج|wikivoyage/.test(q))return 'guide';
 if(/ريدي?ت|reddit|(?:تجارب|تجربة|اراء|كلام)\s+(?:الناس|المسافرين)/.test(q))return 'experience';
}
export function communityLabel(c:KnowledgeCard){return c.communityKind==='guide'?'دليل سفر جماعي':c.communityKind==='experience'?'تجربة مسافر فردية — ليست قاعدة عامة':'';}
export function attributionText(c:KnowledgeCard){const a=c.attribution;return a?[a.author,a.changes,a.license?`النص المقتبس بتصرف متاح برخصة ${a.license}: ${a.licenseUrl}`:''].filter(Boolean).join(' · '):'';}
export function asksAccommodationRegistration(q:string){const s=normalizeSearch(q);return /(?:تسجيل|اسجل|سجل).{0,80}(?:سكن|اقام|فندق)|(?:سكن|اقام|فندق).{0,80}(?:تسجيل|اسجل|سجل)|regist.{0,80}(?:accommodat|residen|hotel)|(?:accommodat|residen|hotel).{0,80}registr/.test(s);}
export function questionTopics(q:string):Topic[]{
 const s=normalizeSearch(q),words=s.split(/[\s،؛؟?!.,:()]+/),insurance=/تامين|insurance/.test(s);
 const venue=/متحف|متاحف|معلم|معالم|حديق|برج|قصر|معبد|museum|attraction/.test(s),venueVisit=venue&&/دخول|فتح|اغلاق|ساع|موعد|حجز|تذاكر|تذكر|entry|admission|opening|hours|ticket|book/.test(s);
 // Entry to an attraction is not immigration; explicit visa/passport questions still apply.
 const visa=insurance||asksAccommodationRegistration(q)||/تاشير|جواز|ترانزيت|حدود|visa|passport|transit/.test(s)||/دخول|entry/.test(s)&&(!venueVisit||/دخول\s+(?:الدوله|البلاد|البلد)/.test(s));
 const weather=/موسم|طقس|شهر|اشهر|حرار|مناخ|مطر|اجواء|weather|season/.test(s)||words.some(w=>/^(?:و|ب)?(?:ال)?جو(?:ها|ه|نا)?$/.test(w));
 const found:Record<Topic,boolean>={overview:false,season:weather||!venueVisit&&/وقت/.test(s),activities:venue||/باندا|تذاكر|panda|نشاط|انشط|تجارب|تجرب|زيار|سياح/.test(s),transport:/مطار|مترو|حافل|airport|metro|نقل|قطار|مواصل|سكن|فندق|فنادق|hotel|transport/.test(s),food:/حلال|halal|اكل|طعام|مطعم|مطاعم|عادات|اداب|food/.test(s),visa,safety:insurance||/امن|سلام|صح|انترنت|اتصال|safety/.test(s),budget:/سعر|اسعار|رخيص|ارخص|ميزاني|تكلف|دفع|بطاق|payment|cost|budget/.test(s),holidays:/عطل|اجاز|زحم|اعياد|holiday/.test(s)};
 return (Object.keys(found) as Topic[]).filter(topic=>found[topic]);
}
export function searchCards(cards:KnowledgeCard[],q:string,topic=''){const words=normalizeSearch(q).split(/\s+/).filter(w=>w.length>1);return cards.filter(c=>(!topic||c.topic===topic)&&(!words.length||words.some(w=>normalizeSearch(c.title+' '+c.text).includes(w))));}

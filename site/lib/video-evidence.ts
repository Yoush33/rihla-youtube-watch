import {z} from 'zod';
import {chinaVideoCards} from './china-video';
import type {KnowledgeCard} from './knowledge';
export const videoBasis={frame:'لقطة ثابتة عند توقيت محدد — ليست مشاهدة متصلة',description:'شرح الناشر المكتوب — لم يُراجع الفيديو',transcript:'مراجعة تفريغ نصي — ليست مشاهدة',visual:'مراجعة مرئية للفترة المحددة'};
const https=z.string().url().refine(s=>{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;});
export const videoEvidenceSchema=z.object({url:https,publisher:z.string().trim().min(2).max(180),basis:z.enum(['description','transcript','visual','frame']),start:z.number().int().min(0).max(86400).nullable(),end:z.number().int().positive().max(86400).nullable(),duration:z.number().int().positive().max(86400).nullable()}).superRefine((v,c)=>{
 if(v.basis==='description'&&(v.start!==null||v.end!==null))c.addIssue({code:'custom',message:'وصف الناشر لا يثبت توقيت المقطع'});
 if(v.basis==='frame'&&(v.start===null||v.end!==null||(v.duration!==null&&v.start>=v.duration)))c.addIssue({code:'custom',message:'حدد توقيت لقطة داخل مدة الفيديو دون فترة مشاهدة'});
 if(v.basis!=='description'&&v.basis!=='frame'&&(v.start===null||v.end===null||v.end<=v.start))c.addIssue({code:'custom',message:'حدد فترة مراجعة صحيحة'});
 if(v.duration!==null&&v.end!==null&&v.end>v.duration)c.addIssue({code:'custom',message:'التوقيت يتجاوز مدة الفيديو'});
});
export type VideoEvidence=z.infer<typeof videoEvidenceSchema>;
export function timeLabel(n:number){return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');}
export function videoLink(v:VideoEvidence){const u=new URL(v.url);if(v.start!==null&&['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname))u.searchParams.set('t',String(v.start)+'s');return u.href;}
export function evidenceSummary(c:KnowledgeCard){const v=c.video;if(!v)return '';return videoBasis[v.basis]+' · '+v.publisher+(v.basis==='frame'&&v.start!==null?' · عند '+timeLabel(v.start):v.start!==null&&v.end!==null?' · '+timeLabel(v.start)+'–'+timeLabel(v.end):' · لا توقيت متحقق')+(c.status==='personal'?' · وفق تسجيلك، لم يتحقق الموقع منه':'');}
const source='https://www.okayama-japan.jp/en/24343';
// These are paraphrases of the official publisher page inspected 2026-09-25, NOT video/transcript reviews.
const japanVideoCards:KnowledgeCard[]=[
 {id:'video-jp-transit',code:'JP',topic:'transport',title:'آداب القطار والحافلة في اليابان',text:'عند التنقل انتبه إلى مستوى صوت الحديث، وطريقة استخدام المقعد، ومكان حمل الأمتعة مراعاةً لمن حولك. هذه خلاصة الشرح الرسمي المصاحب للفيديو، وليست مراجعة لمشاهده. لا يقدم هذا المرجع أسعار تذاكر أو مسارات نقل.',video:{url:'https://www.youtube.com/watch?v=syMm02MLAsg',publisher:'وكالة السياحة اليابانية — إحالة اتحاد سياحة أوكاياما',basis:'description',start:null,end:null,duration:null}},
 {id:'video-jp-photos',code:'JP',topic:'activities',title:'التصوير باحترام في اليابان',text:'راعِ خصوصية الآخرين أثناء تصوير الشوارع والمعالم؛ الاستمتاع بالمنظر لا يغني عن الانتباه لمن حولك. هذا تلخيص لشرح الناشر الرسمي، وليس تحديدًا لقواعد كل معلم؛ راجع تعليمات التصوير في المكان نفسه.',video:{url:'https://www.youtube.com/watch?v=eR3mc9bXoo4',publisher:'وكالة السياحة اليابانية — إحالة اتحاد سياحة أوكاياما',basis:'description',start:null,end:null,duration:null}},
 {id:'video-jp-restaurants',code:'JP',topic:'food',title:'الاستعداد لتجربة المطاعم اليابانية',text:'يشير الدليل الرسمي إلى أن معرفة طريقة الطلب وآداب المائدة ودفع الحساب تساعد الزائر في المطعم. الشرح المتاح لا يفصل هذه الخطوات، لذا لم ننسب إليه قواعد محددة أو معلومات عن الحلال أو الأسعار.',video:{url:'https://www.youtube.com/watch?v=MhZjkyQr4H0',publisher:'وكالة السياحة اليابانية — إحالة اتحاد سياحة أوكاياما',basis:'description',start:null,end:null,duration:null}}
].map(c=>({...c,source,checked:'2026-09-25',status:'reference',revision:0,archived:false,text:c.text+'\nصفحة الناشر مؤرخة ٤ مارس ٢٠٢٥؛ تعذر تشغيل الفيديو أثناء جمع المرجع.'})) as KnowledgeCard[];

export const videoCards:KnowledgeCard[]=[...japanVideoCards,...chinaVideoCards];

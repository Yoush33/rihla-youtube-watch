export type PlaceEnrichment={
 location:{lat:number;lng:number};
 coordinateSource:{url:string;name:string;license:string;checked:string;scope:string;datum:'WGS84'};
 visit:{minMinutes:number;maxMinutes:number;basis:'editorial';note:string};
 categories:string[];
};
const point=(lat:number,lng:number,q:string,scope:string):Pick<PlaceEnrichment,'location'|'coordinateSource'>=>({location:{lat,lng},coordinateSource:{url:'https://www.wikidata.org/wiki/'+q,name:'Wikidata · '+q,license:'CC0',checked:'2026-09-26',datum:'WGS84',scope}});
const visit=(minMinutes:number,maxMinutes:number):PlaceEnrichment['visit']=>({minMinutes,maxMinutes,basis:'editorial',note:'نطاق تحريري للتخطيط، لا متوسط مقاس من الزوار. يستخدم التوزيع الحد الأعلى مبدئيًا؛ عدّله حسب تجربتك.'});
export const cnPlaceEnrichment:Record<string,PlaceEnrichment>={
 'cn-beijing-palace-museum':{...point(39.915833,116.390833,'Q80290','نقطة مرجعية لمجمع المدينة المحرمة؛ ليست بوابة الدخول.'),visit:visit(120,240),categories:['ثقافة','تاريخ']},
 'cn-beijing-jingshan':{...point(39.923611,116.390556,'Q734499','نقطة لحديقة جينغشان؛ لم تثبت بوابة الدخول أو موقع الجناح بدقة.'),visit:visit(60,120),categories:['إطلالة','حدائق']},
 'cn-beijing-temple-heaven':{...point(39.882194,116.406611,'Q125445','نقطة لمجمع معبد السماء؛ ليست بوابة أو مسارًا بين المعالم الداخلية.'),visit:visit(90,180),categories:['ثقافة','حدائق']},
 'cn-shanghai-bund':{...point(31.238056,121.486111,'Q125474','نقطة لمنطقة البوند؛ الواجهة ممتدة وليست هذه بداية مشي مؤكدة.'),visit:visit(45,90),categories:['مشي','عمارة']},
 'cn-shanghai-yuyuan':{...point(31.229167,121.4875,'Q1328025','نقطة لأرض حديقة يويوان؛ ليست مدخلًا موثقًا.'),visit:visit(60,120),categories:['ثقافة','حدائق']},
 'cn-shanghai-museum-peoples-square':{...point(31.230281,121.470561,'Q1051293','مبنى المتحف في ساحة الشعب، 201 رنمين؛ لا يخص الفرع الشرقي ولا يثبت مدخل التذاكر.'),visit:visit(90,180),categories:['متحف','ثقافة']},
};

import type {KnowledgeCard,Topic} from './knowledge';

// Only the adapted Wikivoyage text entries carry CC BY-SA 4.0, not application code.
export const communityChecked='2026-09-26';
const licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/';
const sources={
 china:{url:'https://en.wikivoyage.org/wiki/China',name:'Wikivoyage · China',page:'China'},
 beijing:{url:'https://en.wikivoyage.org/wiki/Beijing',name:'Wikivoyage · Beijing',page:'Beijing'},
 shanghai:{url:'https://en.wikivoyage.org/wiki/Shanghai',name:'Wikivoyage · Shanghai',page:'Shanghai'},
 month:{url:'https://www.reddit.com/r/travelchina/comments/1m0cnyz/post_china_trip_advice/',name:'Reddit / r/travelchina · Post China Trip Advice',author:'u/Alternative_Table107',published:'2025-07-15'},
 tenDays:{url:'https://www.reddit.com/r/chinatravel/comments/1u3c85t/just_returned_from_10_days_in_china/',name:'Reddit / r/chinatravel · Just returned from 10 days in China',author:'u/I_dont_know2687',published:'2026-06-11'},
};
function guide(id:string,key:'china'|'beijing'|'shanghai',topic:Topic,title:string,text:string,city?:string):KnowledgeCard{
 const s=sources[key];
 return {id:'community-CN-'+id,code:'CN',topic,title,text,source:s.url,sourceName:s.name,checked:communityChecked,status:'editorial',sourceKind:'community',communityKind:'guide',city,revision:0,archived:false,applicability:'دليل جماعي للتخطيط، لا توقع طقس ولا أسعار حية ولا مرجع لشروط الدخول.',attribution:{author:'مساهمو '+s.name,license:'CC BY-SA 4.0',licenseUrl,historyUrl:'https://en.wikivoyage.org/w/index.php?title='+s.page+'&action=history',changes:'خلاصة عربية مختصرة ومكيّفة؛ حُذفت الأسعار والمعلومات المتغيرة غير المتحققة'}};
}
function experience(id:string,key:'month'|'tenDays',topic:Topic,title:string,text:string):KnowledgeCard{
 const s=sources[key];
 return {id:'community-CN-'+id,code:'CN',topic,title,text,source:s.url,sourceName:s.name,sourcePublished:s.published,checked:communityChecked,status:'editorial',sourceKind:'community',communityKind:'experience',revision:0,archived:false,applicability:'رواية فردية منشورة؛ ليست تجربة ميدانية لرِحلة ولا تحققًا مستقلًا من نجاح الخدمة أو ملاءمتها لرحلتك.',attribution:{author:s.author,changes:'تلخيص عربي تحريري لتجربة منشورة؛ لم ننقل المنشور كاملًا'}};
}

export const communityKnowledge:KnowledgeCard[]=[
 guide('city-choices','china','overview','الصين · أي مدينة تناسب اهتمامك؟','يعرض دليل Wikivoyage بكين للمعالم الإمبراطورية، وشنغهاي للأفق الحديث والمباني التاريخية، وتشنغدو للباندا والطعام الحار، وشيآن للتراث وجيش التيراكوتا. هذه نقاط بداية لاختيار المدن؛ لا تعني أن جمعها كلها مناسب لمدة رحلتك.'),
 guide('chinese-addresses','china','transport','العناوين الصينية تساعدك في التنقل','يشير الدليل إلى أن الماندرين لغة التواصل المشتركة، وأن كتابة الأسماء بالـ«بينين» قد تلتبس بسبب تشابه النطق. احتفظ بعنوان السكن والمعالم بالحروف الصينية إلى جانب الاسم المترجم لتسهيل إظهاره للسائق أو البحث عنه.'),
 guide('beijing-season','beijing','season','بكين · وصف موسمي من دليل جماعي','يصف Wikivoyage صيف بكين بالحار الرطب وشتاءها بالبارد الجاف، ويقترح سبتمبر وأكتوبر لفصل الخريف. قد يصاحب الربيع غبار. هذا وصف موسمي عام؛ لا يتنبأ بطقس موعدك ولا يثبت أن هذه الأشهر أرخص أو أقل ازدحامًا.','beijing'),
 guide('beijing-mobility','beijing','transport','بكين · المترو أساس مبدئي للتنقل','يعرض الدليل المترو وسيلة واسعة التغطية للوصول إلى كثير من معالم بكين، مع الحافلات والدراجات المشتركة لاستكمال بعض التنقلات. قارن موقع سكنك والمحطة الأقرب للأماكن التي اخترتها، وتحقق من المسار الحالي قبل الخروج. لم ننقل أسعارًا أو ساعات تشغيل.','beijing'),
 guide('shanghai-areas','shanghai','activities','شنغهاي · افهم ضفتي النهر قبل توزيع الأيام','يفصل نهر هوانغبو بين بوكسي غربًا وبودونغ شرقًا. يصف الدليل واجهة البوند التاريخية مقابل أفق لوجياتسوي الحديث، وأحياء مثل تيانزيفانغ وشينتياندي لاستكشاف مباني شيكومن والمتاجر. استخدم الأحياء كنقاط تجميع للأماكن، ثم تحقق من التنقل الفعلي بينها.','shanghai'),
 guide('shanghai-season','shanghai','season','شنغهاي · اعتدال الخريف ورطوبة الصيف','يصف الدليل مناخ شنغهاي بالرطب شبه المداري: ربيع كثير الغيوم والمطر، وصيف حار، وخريف ألطف، وشتاء رطب بارد. تختلف الأجواء بين الأيام؛ هذا مرجع موسمي جماعي، وتوقعات موعد السفر تحتاج مصدرًا يغطي تلك الأيام.','shanghai'),
 experience('payment-backup','month','budget','تجربة شهر · بدائل الدفع عند ضعف الاتصال','ذكر صاحب الرحلة أنه استخدم النقد ثلاث مرات خلال شهر: مرتين لضعف الاتصال ومرة في مكان يقبل النقد فقط. جرّب Alipay وWeChat ووجد البديل مفيدًا عندما تعثر أحدهما. هذه تجربته الشخصية؛ لا تثبت أن بطاقتك أو كل المتاجر ستعمل بالطريقة نفسها.'),
 experience('train-stations','month','transport','تجربة شهر · اترك وقتًا لمحطة القطار','استخدم الكاتب 12306 لحجز القطارات، ووصف إجراءات التحقق بأنها مزعجة لكنها ممكنة. لفت إلى كبر المحطات وإجراءات الفحص الأمني، وأوصى بترك وقت للوصول إلى الرصيف. لم نحدد هامشًا زمنيًا ثابتًا؛ راجع تعليمات المحطة ورحلتك.'),
 experience('maps-backup','month','transport','تجربة شهر · تطبيقات الخرائط البديلة','ذكر صاحب رحلة الشهر أنه لم يتمكن من الاعتماد على Google Maps واستخدم Apple Maps وAMAP. هذه ملاحظته على ظروف رحلته، وليست اختبارًا لكل التطبيقات والأجهزة والشبكات. احتفظ بعنوان وجهتك بالصينية وجرّب التطبيق قبل الاعتماد على المسار.'),
 experience('bank-verification','tenDays','budget','تجربة عشرة أيام · ربط البطاقة قد يحتاج متابعة','أفاد الكاتب بأن ربط بطاقته في Alipay نجح بعد التواصل مع قسم مكافحة الاحتيال في بنكه، بينما لم ينجح معه WeChat. لم يحتج النقد في رحلته؛ هذه نتيجة فردية لا تضمن تكرارها مع بطاقتك أو الأماكن التي ستزورها.'),
 experience('qr-menus','tenDays','food','تجربة عشرة أيام · طلب الطعام برمز QR','ذكر الكاتب شيوع طلب الطعام عبر رموز QR في الأماكن التي زارها، ولم تعجبه قلة التفاعل مع الموظفين. هذه ملاحظة عن أسلوب الخدمة وتفضيل شخصي، وليست تقييمًا لجودة الطعام أو حكمًا على جميع المطاعم.'),
 experience('maps-worked','tenDays','transport','تجربة عشرة أيام · Google Maps عمل معه','قال صاحب رحلة الأيام العشرة إن Google Maps عمل معه أثناء التنقل. هذا تقرير عن تجربته فقط؛ لا يثبت توافر التطبيق أو دقته على كل شبكة أو في كل مدينة. لم نختبر إعدادات جهازه أو نتحقق ميدانيًا من النتائج.'),
];

export const communityComparisons=[
 {title:'الدفع والخرائط: اقرأ التجربتين معًا',text:'احتاج صاحب رحلة الشهر النقد أحيانًا، ولم يحتجه صاحب الأيام العشرة. واختلفا أيضًا بشأن نجاح Google Maps. تعكس الروايتان رحلتين مختلفتين في التاريخ والظروف؛ لا نرجح إحداهما كقاعدة لكل مسافر، ولم نختبر التطبيقات ميدانيًا.',sources:[sources.month,sources.tenDays]},
];

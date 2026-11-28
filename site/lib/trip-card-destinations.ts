import type {BoredType} from './bored-schema';
import type {TripCard,TripCardCost,TripCardGroup} from './trip-card-schema';

type NewDestination = {
  id:TripCard['id'];
  country:TripCard['country'];
  city:string;
  neighborhood:string;
  hotel:string;
  hotelNotes:string;
  hours:number;
  types:BoredType[];
  best:number[];
  ok:number[];
  prices:{flight:number;hotel:number;daily:number;spa:number;taxi:number};
  visaSource:string;
  why:string[];
  cautions:string[];
  walk:TripCard['walk'];
};

const visaTurkey='الخارجية التركية · إعفاء الجواز السعودي العادي للزيارة القصيرة';
const visaGeorgia='الجريدة التشريعية الجورجية · إعفاء الجواز السعودي؛ راجع التأمين في الدليل';
const visaThailand='هيئة السياحة التايلندية · راجع شروط الإعفاء السياحي في دليل الدولة';
const place=(kind:string,description:string,query:string,car=false)=>({kind,description,query,car,minutes:''});
const checked='2026-11-25';
const walkingSearches = {
  'فطور':'مطاعم فطور',
  'طبيعة':'ممشى وطبيعة',
  'مساج':'مساج',
  'عشاء':'مطاعم عشاء',
};

export const newDestinations:NewDestination[] = [
  {
    id:'uzn',country:'tr',city:'أوزنجول',neighborhood:'البحيرة، طرابزون',hotel:'Kibar Hotel',
    hotelNotes:'يبعد نحو كيلومترين عن البحيرة حسب الحزمة.',
    hours:9,types:['nature','relax'],best:[6,7,8,9],ok:[5,10],
    prices:{flight:1169,hotel:219,daily:170,spa:200,taxi:300},visaSource:visaTurkey,
    why:['بحيرة وجبال وممشى حول البحيرة.'],
    cautions:['خيار الطيران المسجّل عبر صبيحة. الطريق من مطار طرابزون نحو ساعة ونصف.', 'المساج في بعض المنتجعات ويحتاج تحقق.'],
    walk:[
      place('طبيعة','ممشى حول البحيرة. السكن المسجّل على بعد نحو كيلومترين.','Uzungöl Lake, Trabzon'),
      place('مساج','ابحث عن سبا في المنتجعات وتحقق من المسافة والسعر.','Uzungol spa resort'),
    ],
  },
  {
    id:'gbl',country:'az',city:'غابالا',neighborhood:'منتجع بحيرة نوهور',hotel:'LakeSide Hotel & Spa',
    hotelNotes:'الفطور والسبا والإلغاء المجاني مذكورة في الحزمة؛ تحقق من العرض الحالي.',
    hours:12.5,types:['nature','relax'],best:[5,6,9],ok:[4,7,8,10],
    prices:{flight:2028,hotel:128,daily:150,spa:200,taxi:600},
    visaSource:'دائرة الهجرة الأذربيجانية · إعفاء سياحي مؤقت للجواز السعودي العادي حتى ١٥ فبراير ٢٠٢٧',
    why:['بحيرة وغابات وجبال وتلفريك؛ السكن المسجّل فيه سبا.'],
    cautions:['التنقل من باكو نحو ثلاث ساعات ونصف بالسيارة حسب الحزمة.', 'السكن خارج البلدة. خطّط للمطاعم والتنقل بالسيارة.'],
    walk:[
      place('فطور','الفطور مذكور ضمن عرض الفندق.','LakeSide Hotel & Spa Gabala'),
      place('طبيعة','بحيرة نوهور قرب المنتجع.','Nohur Lake Gabala'),
      place('مساج','السبا في الفندق؛ تحقق من المواعيد والرسوم.','LakeSide Hotel & Spa Gabala'),
      place('عشاء','مطاعم البلدة تحتاج سيارة من موقع السكن.','restaurants Gabala',true),
    ],
  },
  {
    id:'kzb',country:'ge',city:'كازبيغي',neighborhood:'ستيبانتسميندا',hotel:'Hotel Horizon',
    hotelNotes:'الفطور والإلغاء المجاني مذكوران في الحزمة؛ تحقق من العرض الحالي.',
    hours:15,types:['nature'],best:[6,7,8,9],ok:[5,10],
    prices:{flight:1683,hotel:116,daily:130,spa:0,taxi:300},visaSource:visaGeorgia,
    why:['السكن في البلدة وفيها مسارات باتجاه جبل كازبيغي وكنيسة غيرغيتي.'],
    cautions:['الحزمة تذكر نحو ثلاث ساعات بالسيارة من تبليسي. تحقّق من الطريق والطقس.', 'خيار الطيران المسجّل طويل والمساج القريب يحتاج تحديد.'],
    walk:[
      place('فطور','الفطور مذكور في عرض الفندق.','Hotel Horizon Stepantsminda'),
      place('طبيعة','مسار كنيسة غيرغيتي من البلدة؛ تحقق من الوقت وحالة المسار.','Gergeti Trinity Church Stepantsminda'),
    ],
  },
  {
    id:'bus',country:'ge',city:'باتومي',neighborhood:'البلدة القديمة والممشى',hotel:'Hotel Park',
    hotelNotes:'الفطور والإلغاء المجاني مذكوران في الحزمة؛ تحقق من العرض الحالي.',
    hours:12,types:['sea','city','relax'],best:[6,7,8,9],ok:[5,10],
    prices:{flight:1387,hotel:215,daily:130,spa:150,taxi:60},visaSource:visaGeorgia,
    why:['البلدة القديمة وممشى باتومي البحري.'],
    cautions:['خيار الطيران في الحزمة فيه انتظار عبر صبيحة.', 'تحقق من الطقس قبل اعتماد برنامج بحري.'],
    walk:[
      place('فطور','الفطور مذكور في عرض الفندق.','Hotel Park Batumi'),
      place('طبيعة','ممشى باتومي البحري قرب البلدة القديمة.','Batumi Boulevard'),
    ],
  },
  {
    id:'kbv',country:'th',city:'كرابي',neighborhood:'آو نانغ',hotel:'',
    hotelNotes:'الفندق محل التسعير ورد على بُعد ١٫٥ كم من الشاطئ دون اسم.',
    hours:16.5,types:['sea','relax','nature'],best:[12,1,2,3],ok:[11,4],
    prices:{flight:1671,hotel:170,daily:130,spa:60,taxi:120},visaSource:visaThailand,
    why:['شاطئ آو نانغ ورحلات قارب للجزر وخيارات مساج تايلندي.'],
    cautions:['الوصول طويل وفيه توقف. مقعد الأميال يحتاج تحقق.', 'تأكد من اسم الفندق ومسافة المشي الفعلية.'],
    walk:[
      place('طبيعة','شاطئ آو نانغ نحو ١٫٥ كم من السكن المذكور.','Ao Nang Beach Krabi'),
      place('مساج','خيارات مساج في آو نانغ؛ اختر مكانًا بعد تثبيت السكن.','Thai massage Ao Nang Krabi'),
    ],
  },
  {
    id:'cnx',country:'th',city:'شيانغ ماي',neighborhood:'البلدة القديمة',hotel:'',
    hotelNotes:'حدد اسم الفندق قبل الحجز.',
    hours:16.5,types:['nature','city','relax'],best:[11,12,1,2],ok:[10,3],
    prices:{flight:2246,hotel:172,daily:120,spa:60,taxi:60},visaSource:visaThailand,
    why:['معابد ومقاهٍ ومساج داخل البلدة القديمة.'],
    cautions:['خيار الطيران المسجّل طويل.', 'الشلالات والجبل خارج البلدة ويحتاجان سيارة.'],
    walk:[
      place('فطور','ابحث عن مقهى قريب بعد تحديد السكن.','Chiang Mai Old City breakfast'),
      place('طبيعة','الشلالات والجبل خارج البلدة القديمة.','Doi Suthep Chiang Mai',true),
      place('مساج','خيارات مساج داخل البلدة القديمة.','Chiang Mai Old City massage'),
    ],
  },
  {
    id:'lgk',country:'my',city:'لنكاوي',neighborhood:'بانتاي تشينانغ',hotel:'The Bayou',
    hotelNotes:'الفطور والإلغاء المجاني مذكوران في الحزمة؛ تحقق من العرض الحالي.',
    hours:16,types:['sea','relax'],best:[12,1,2,3],ok:[11,4],
    prices:{flight:3600,hotel:371,daily:150,spa:150,taxi:60},
    visaSource:'افتراض الحزمة · راجع متطلبات الدخول والرسوم في دليل ماليزيا',
    why:['السكن المسجّل قريب من شاطئ تشينانغ.'],
    cautions:['خيار الطيران المسجّل فيه توقفان. راجع التكلفة الكاملة قبل الحجز.'],
    walk:[
      place('فطور','الفطور مذكور في عرض الفندق.','The Bayou Hotel Langkawi'),
      place('طبيعة','شاطئ بانتاي تشينانغ؛ تحقق من المسافة من الفندق.','Pantai Cenang Langkawi'),
    ],
  },
  {
    id:'ela',country:'lk',city:'إيلا',neighborhood:'البلدة',hotel:'Mango Shadow Inn',
    hotelNotes:'حدد موقع السكن وتوافقه مع طريق الوصول.',
    hours:13.5,types:['nature','relax'],best:[1,2,3],ok:[12,4],
    prices:{flight:1930,hotel:148,daily:110,spa:100,taxi:450},
    visaSource:'دائرة الهجرة السريلانكية · ETA السياحي مجاني للجواز السعودي ضمن البرنامج',
    why:['مسار آدم بيك الصغير وجسر التسعة أقواس من خيارات المشي.'],
    cautions:['النقل من كولومبو بالسيارة نحو ٥–٦ ساعات حسب الحزمة، والقطار خيار يحتاج تحقق.', 'قدّم على التصريح الإلكتروني قبل الوصول وراجع الدليل.'],
    walk:[
      place('طبيعة · مسار الجبل','مسار آدم بيك الصغير؛ تحقق من وقت المشي من السكن.','Little Adam’s Peak Ella'),
      place('طبيعة · الجسر','جسر التسعة أقواس؛ اختر نقطة بداية المشي بعد تحديد الطريق.','Nine Arches Bridge Ella'),
    ],
  },
];

function makeCard(destination:NewDestination):TripCard {
  const {id,country,city,neighborhood,hotel,hotelNotes,prices,visaSource,walk,cautions} = destination;
  const quote = (value:number,source:string):TripCardCost => ({value,source,checkedOn:checked,estimated:true});
  const missing = {value:null,source:'يحتاج تحقق من السعودية',checkedOn:null,estimated:false};
  const lodging = hotel || [neighborhood,city].join('، ');
  const walking = Object.entries(walkingSearches).flatMap(([kind, search]) => {
    const listed = walk.filter(item => item.kind.split(' · ')[0] === kind);
    return listed.length ? listed : [{...place(kind,'حدد مكانًا مناسبًا من السكن.',search + ' قرب ' + lodging), needsLocation:true}];
  });
  return {
    id,country,city,neighborhood,hotel,hotelNotes,walk:walking,
    milesRoute:'unknown', mode:'cash',
    routeNote:'تشغيل السعودية على المسار ومقعد الفرسان يحتاجان تحقق.',
    costs:{
      flight:quote(prices.flight,'Google Flights · سعر من الحزمة لتواريخ ديسمبر'),
      hotel:quote(prices.hotel,'Booking.com · تقدير سعر الليلة من الحزمة'),
      daily:quote(prices.daily,'مصروف يومي تقديري في الحزمة'),
      spa:quote(prices.spa,prices.spa===0?'التقدير يستبعد تكلفة المساج؛ تحقق من الخيارات':'تقدير المساج في الحزمة'),
      taxi:quote(prices.taxi,'تقدير نقل المطار في الحزمة'),
      visa:quote(0,visaSource),
      milesCash:{...missing},milesCount:{...missing},
    },
    checklist:[
      {text:'تحقق من الطيران والسكن وأسعار التواريخ المختارة.',done:false},
      {text:'راجع شروط الدخول في دليل الدولة.',done:false},
      ...cautions.map(text=>({text,done:false})),
    ],
    events:'',post:{},
  };
}

const newCards = new Map(newDestinations.map(destination=>[destination.id,makeCard(destination)]));
const group = (id:string,name:string,ids:TripCard['id'][]):TripCardGroup => ({
  id,name,start:'2026-12-09',end:'2026-12-13',historical:true,
  trips:ids.map(code=>newCards.get(code)!),
});

export const newTripGroups = [
  group('dec-black-sea','ديسمبر · أوزنجول وكازبيغي وباتومي',['uzn','kzb','bus']),
  group('dec-southeast-asia','ديسمبر · تايلند وماليزيا',['kbv','cnx','lgk']),
  group('dec-gabala-ella','ديسمبر · غابالا وإيلا',['gbl','ela']),
];

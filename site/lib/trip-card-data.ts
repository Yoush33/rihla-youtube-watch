import {newTripGroups} from './trip-card-destinations';
import type {TripCards} from './trip-card-schema';

// Historical sample quotes from the supplied Rihla card, checked 23–24 November 2026.
export const initialTripCards: TripCards = {
  budget: 5000,
  countryDone: {},
  groups: [
  {
    id: "dec-near",
    name: "ديسمبر: تركيا وجورجيا",
    start: "2026-12-09",
    end: "2026-12-13",
    historical: true,
    trips: [
    {
      id: "ayt",
      country: "tr",
      city: "أنطاليا",
      neighborhood: "كاليتشي",
      hotel: "Hotel Lykia Old Town",
      hotelNotes: "فطور مشمول · إلغاء مجاني",
      milesRoute: "unavailable",
      routeNote: "السعودية ما تطير الرياض–أنطاليا على هالتواريخ",
      mode: "cash",
      costs: {
      flight: {"value":1240,"source":"Google Flights · Pegasus عبر صبيحة · 6س 25د · الشنطة غالبًا بفلوس","checkedOn":"2026-11-24","estimated":false},
      hotel: {"value":326,"source":"Booking · فطور + إلغاء مجاني","checkedOn":"2026-11-24","estimated":false},
      daily: {"value":170,"source":"تقديري 170 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":150,"source":"تقديري · حمام سفا","checkedOn":null,"estimated":true},
      taxi: {"value":150,"source":"تقديري · 8 كم","checkedOn":null,"estimated":true},
      milesCash: {"value":null,"source":"رسوم الأميال غير متحققة","checkedOn":null,"estimated":false,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true},
      visa: {"value":null,"source":"الرسوم غير مدخلة","checkedOn":null,"estimated":false}
    },
      walk: [
      {"kind":"فطور","description":"مشمول بالفندق، ومقاهي كاليتشي حولك (1–5 د)","query":"Kaleici Antalya cafe","minutes":"1–5","car":false},
      {"kind":"طبيعة · الحديقة","description":"حديقة كارالي أوغلو على الجرف، على بعد 350 م.","query":"Karaalioglu Park Antalya","minutes":"","car":false},
      {"kind":"طبيعة · الشاطئ","description":"شاطئ ميرميرلي، على بعد 300 م.","query":"Mermerli Beach Antalya","minutes":"","car":false},
      {"kind":"مساج","description":"حمام سفا التاريخي داخل كاليتشي (~5 د)","query":"Sefa Hamam Kaleici","minutes":"حوالي 5","car":false},
      {"kind":"عشاء","description":"مطاعم كاليتشي والميناء القديم (5–10 د)","query":"Antalya old harbour restaurants","minutes":"5–10","car":false},
      {"kind":"شلال دودن السفلي","description":"يبعد 9 كم عن السكن.","query":"Lower Duden Waterfall","minutes":"","car":true},
      {"kind":"المطار","description":"مطار أنطاليا على بعد 8 كم.","query":"Antalya Airport","minutes":"","car":true}
    ],
      checklist: [
      {"text":"سعر Pegasus وهل الشنطة مشمولة","done":false},
      {"text":"سعر الغرفة وإتاحتها","done":false},
      {"text":"سعر حمام سفا وموعده","done":false}
    ],
      events: "ما انفحصت فعاليات لهالتواريخ",
      post: {}
    },
    {
      id: "ist",
      country: "tr",
      city: "إسطنبول",
      neighborhood: "أورتاكوي",
      hotel: "Bosphorus Bridge",
      hotelNotes: "400 م من أورتاكوي · إلغاء مجاني",
      milesRoute: "available",
      routeNote: "مسار السعودية وارد في فحص البطاقة المرفقة. مقعد الفرسان غير متحقق.",
      mode: "cash",
      costs: {
      flight: {"value":918,"source":"Google Flights · طيران ناس مباشر 4س 15د · السعودية مباشر 1,199","checkedOn":"2026-11-24","estimated":false},
      hotel: {"value":208.5,"source":"Booking · Berfinn انحجز فجر 24 نوفمبر فاستبدلته","checkedOn":"2026-11-24","estimated":false},
      daily: {"value":250,"source":"تقديري 250 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":410,"source":"تقديري · كيليتش علي باشا","checkedOn":null,"estimated":true},
      taxi: {"value":430,"source":"تقديري · ~55 د للمطار","checkedOn":null,"estimated":true},
      milesCash: {"value":500,"source":"افتراض من البطاقة المرفقة","checkedOn":null,"estimated":true,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true},
      visa: {"value":null,"source":"الرسوم غير مدخلة","checkedOn":null,"estimated":false}
    },
      walk: [
      {"kind":"فطور","description":"مقاهي ساحة أورتاكوي (~5 د)","query":"Ortakoy square cafe","minutes":"حوالي 5","car":false},
      {"kind":"طبيعة · ممشى البوسفور","description":"من أورتاكوي إلى أرناؤوط كوي وبيبك.","query":"Ortakoy to Bebek Bosphorus Walk","minutes":"45–60","car":false},
      {"kind":"طبيعة · حديقة يلدز","description":"حديقة يلدز قرب أورتاكوي.","query":"Yildiz Park Istanbul","minutes":"حوالي 15","car":false},
      {"kind":"مساج","description":"حمّام كيليتش علي باشا في كاراكوي، نحو 20 دقيقة بالسيارة. السبا القريب فاخر وغالٍ.","query":"Kilic Ali Pasa Hamami","minutes":"","car":true},
      {"kind":"عشاء · أورتاكوي","description":"مطاعم على البحر.","query":"Ortakoy waterfront restaurants","minutes":"1–15","car":false},
      {"kind":"عشاء · كوروتشيشمه","description":"مطاعم على البحر قرب أورتاكوي.","query":"Kurucesme waterfront restaurants Istanbul","minutes":"ضمن 1–15","car":false},
      {"kind":"المطار","description":"مطار إسطنبول على بعد نحو 55 دقيقة بالسيارة.","query":"Istanbul Airport","minutes":"","car":true}
    ],
      checklist: [
      {"text":"مقعد مكافأة على السعودية بنفس الرحلة","done":false},
      {"text":"عدد الأميال والرسوم النقدية","done":false},
      {"text":"سعر الفندق","done":false},
      {"text":"حجز الحمام","done":false}
    ],
      events: "ما انفحصت فعاليات لهالتواريخ",
      post: {}
    },
    {
      id: "tbs",
      country: "ge",
      city: "تبليسي",
      neighborhood: "أبانوتوباني",
      hotel: "New Meidan",
      hotelNotes: "شارع فردوسي · إلغاء مجاني",
      milesRoute: "unavailable",
      routeNote: "السعودية ما تطير الرياض–تبليسي على هالتواريخ",
      mode: "cash",
      costs: {
      flight: {"value":2106,"source":"Google Flights · التركية عبر إسطنبول · 7س 50د","checkedOn":"2026-11-24","estimated":false},
      hotel: {"value":104.25,"source":"Booking · إلغاء مجاني","checkedOn":"2026-11-24","estimated":false},
      daily: {"value":150,"source":"تقديري 150 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":210,"source":"تقديري · 100–200 لاري/ساعة","checkedOn":null,"estimated":true},
      taxi: {"value":100,"source":"تقديري","checkedOn":null,"estimated":true},
      milesCash: {"value":null,"source":"رسوم الأميال غير متحققة","checkedOn":null,"estimated":false,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true},
      visa: {"value":null,"source":"الرسوم غير مدخلة","checkedOn":null,"estimated":false}
    },
      walk: [
      {"kind":"فطور","description":"مقاهي ميدان والبلدة القديمة (3–5 د)","query":"Meidan Tbilisi cafe","minutes":"3–5","car":false},
      {"kind":"طبيعة · الشلال","description":"شلال ليغفتاخيفي.","query":"Leghvtakhevi Waterfall","minutes":"حوالي 5","car":false},
      {"kind":"طبيعة · الحديقة النباتية","description":"حديقة تبليسي النباتية.","query":"National Botanical Garden of Georgia Tbilisi","minutes":"حوالي 15","car":false},
      {"kind":"مساج","description":"حمامات الكبريت جنب الفندق (~3 د)","query":"Abanotubani sulfur baths","minutes":"حوالي 3","car":false},
      {"kind":"عشاء","description":"مطاعم جورجية في البلدة القديمة (5–15 د)","query":"Old Tbilisi restaurants","minutes":"5–15","car":false},
      {"kind":"المطار","description":"المطار فقط (~25 د)","query":"Tbilisi International Airport","minutes":"","car":true}
    ],
      checklist: [
      {"text":"سعر الطيران (رحلة بتوقف)","done":false},
      {"text":"شرط تأمين السفر لدخول جورجيا","done":false},
      {"text":"حجز غرفة الحمام","done":false}
    ],
      events: "ما انفحصت فعاليات لهالتواريخ",
      post: {}
    }
  ]
  },
  {
    id: "dec-india",
    name: "ديسمبر: الهند",
    start: "2026-12-09",
    end: "2026-12-13",
    historical: true,
    trips: [
    {
      id: "vkl",
      country: "in",
      city: "فاركالا",
      neighborhood: "الجرف الشمالي",
      hotel: "Gypsy Walker",
      hotelNotes: "350 م من الجرف · إلغاء مجاني",
      milesRoute: "unavailable",
      routeNote: "السعودية ما تطير الرياض–تريفاندرم على هالتواريخ",
      mode: "cash",
      costs: {
      flight: {"value":2234,"source":"Google Flights · السريلانكية عبر كولومبو · 7س 55د","checkedOn":"2026-11-23","estimated":false},
      hotel: {"value":223.25,"source":"Booking شامل الضريبة · الخيار الأول Sajjoys انحجز وقت الفحص","checkedOn":"2026-11-23","estimated":false},
      daily: {"value":120,"source":"تقديري 120 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":120,"source":"تقديري","checkedOn":null,"estimated":true},
      taxi: {"value":150,"source":"تقديري · ~50 كم","checkedOn":null,"estimated":true},
      visa: {"value":97,"source":"بوابة التأشيرة الهندية · 25 دولار + رسوم بنكية","checkedOn":"2026-11-23","estimated":false},
      milesCash: {"value":null,"source":"رسوم الأميال غير متحققة","checkedOn":null,"estimated":false,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true}
    },
      walk: [
      {"kind":"فطور","description":"مقاهي ممشى الجرف الشمالي (~5 د)","query":"North Cliff Varkala cafe","minutes":"حوالي 5","car":false},
      {"kind":"طبيعة · ممشى الجرف","description":"ممر الجرف الأحمر المطل على البحر.","query":"North Cliff Walk Varkala","minutes":"","car":false},
      {"kind":"طبيعة · شاطئ بابناسام","description":"شاطئ تحت الجرف. البحر تياراته قوية.","query":"Papanasam Beach Varkala","minutes":"حوالي 10","car":false},
      {"kind":"مساج","description":"محلات أيورفيدا على الجرف (~5 د)","query":"Ayurvedic massage North Cliff Varkala","minutes":"حوالي 5","car":false},
      {"kind":"عشاء","description":"مطاعم الجرف المطلة على البحر (5–10 د)","query":"Varkala Cliff restaurants","minutes":"5–10","car":false},
      {"kind":"المطار","description":"مطار تريفاندرم ~1.5 ساعة","query":"Trivandrum International Airport","minutes":"","car":true}
    ],
      checklist: [
      {"text":"التأشيرة الإلكترونية قبل 4 أيام على الأقل","done":false},
      {"text":"سعر السريلانكية والشنطة","done":false},
      {"text":"الغرفة لا زالت متاحة","done":false},
      {"text":"مكان المساج وسعره","done":false}
    ],
      events: "ما لقيت فعالية كبيرة في فاركالا بهالتواريخ",
      post: {}
    },
    {
      id: "cok",
      country: "in",
      city: "كوتشي",
      neighborhood: "جو تاون",
      hotel: "Daffodils Spice Court",
      hotelNotes: "فطور + إلغاء مجاني",
      milesRoute: "unavailable",
      routeNote: "السعودية ما تطير الرياض–كوتشي على هالتواريخ",
      mode: "cash",
      costs: {
      flight: {"value":1736,"source":"Google Flights · السريلانكية · 13س 50د بانتظار طويل · الخليج 2,770 بـ 7س 40د","checkedOn":"2026-11-23","estimated":false},
      hotel: {"value":429.75,"source":"Booking شامل الضريبة · فطور","checkedOn":"2026-11-23","estimated":false},
      daily: {"value":120,"source":"تقديري 120 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":120,"source":"تقديري","checkedOn":null,"estimated":true},
      taxi: {"value":120,"source":"تقديري · ~40 كم","checkedOn":null,"estimated":true},
      visa: {"value":97,"source":"بوابة التأشيرة الهندية · 25 دولار + رسوم بنكية","checkedOn":"2026-11-23","estimated":false},
      milesCash: {"value":null,"source":"رسوم الأميال غير متحققة","checkedOn":null,"estimated":false,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true}
    },
      walk: [
      {"kind":"فطور","description":"مقاهي جو تاون (~3 د)","query":"Jew Town Kochi cafe","minutes":"حوالي 3","car":false},
      {"kind":"طبيعة · شاطئ فورت كوتشي","description":"الشاطئ على بعد نحو 2.4 كم من الحي.","query":"Fort Kochi Beach","minutes":"","car":true},
      {"kind":"طبيعة · شباك الصيد","description":"شباك الصيد الصينية قرب الشاطئ.","query":"Chinese Fishing Nets Fort Kochi","minutes":"","car":true},
      {"kind":"مساج","description":"مراكز أيورفيدا في فورت كوتشي (تحقق المسافة)","query":"Ayurveda Fort Kochi","minutes":"","car":false},
      {"kind":"عشاء · فورت كوتشي","description":"مطاعم فورت كوتشي.","query":"Fort Kochi restaurants","minutes":"","car":false},
      {"kind":"عشاء · متنشيري","description":"مطاعم متنشيري قرب جو تاون.","query":"Mattancherry restaurants Kochi","minutes":"","car":false},
      {"kind":"المطار","description":"مطار كوتشي على بعد نحو ساعة ونصف.","query":"Cochin International Airport","minutes":"","car":true},
      {"kind":"بحيرات كيرالا","description":"زيارة البحيرات الخلفية تحتاج يومًا.","query":"Kerala backwaters","minutes":"","car":true}
    ],
      checklist: [
      {"text":"التأشيرة الإلكترونية","done":false},
      {"text":"اختيار رحلة بانتظار أقصر","done":false},
      {"text":"الغرفة لا زالت متاحة","done":false}
    ],
      events: "ما لقيت فعالية كبيرة في كوتشي بهالتواريخ",
      post: {}
    },
    {
      id: "goa",
      country: "in",
      city: "غوا",
      neighborhood: "بالوليم",
      hotel: "Alegro Holiday Homes",
      hotelNotes: "200 م من الشاطئ · إلغاء مجاني",
      milesRoute: "unavailable",
      routeNote: "السعودية ما تطير الرياض–غوا على هالتواريخ",
      mode: "cash",
      costs: {
      flight: {"value":1694,"source":"Google Flights · طيران الهند عبر مومباي · 14س 05د","checkedOn":"2026-11-23","estimated":false},
      hotel: {"value":106.25,"source":"Booking شامل الضريبة","checkedOn":"2026-11-23","estimated":false},
      daily: {"value":120,"source":"تقديري 120 ر.س/يوم","checkedOn":null,"estimated":true},
      spa: {"value":120,"source":"تقديري","checkedOn":null,"estimated":true},
      taxi: {"value":400,"source":"تقديري · المطار في الشمال وبالوليم في الجنوب","checkedOn":null,"estimated":true},
      visa: {"value":97,"source":"بوابة التأشيرة الهندية · 25 دولار + رسوم بنكية","checkedOn":"2026-11-23","estimated":false},
      milesCash: {"value":null,"source":"رسوم الأميال غير متحققة","checkedOn":null,"estimated":false,"review":true},
      milesCount: {"value":null,"source":"أميال الفرسان غير متحققة","checkedOn":null,"estimated":false,"review":true}
    },
      walk: [
      {"kind":"فطور","description":"مقاهي الشاطئ (~3 د)","query":"Palolem Beach cafe","minutes":"حوالي 3","car":false},
      {"kind":"طبيعة · بالوليم","description":"شاطئ بالوليم على بعد 200 م.","query":"Palolem Beach","minutes":"","car":false},
      {"kind":"طبيعة · باتنيم","description":"تمشية إلى شاطئ باتنيم.","query":"Patnem Beach","minutes":"حوالي 20","car":false},
      {"kind":"مساج","description":"أكواخ المساج على الشاطئ (تحقق النظافة والسعر)","query":"massage Palolem","minutes":"","car":false},
      {"kind":"عشاء","description":"مطاعم الشاطئ (3–10 د)","query":"Palolem restaurants","minutes":"3–10","car":false},
      {"kind":"المطار","description":"مطار موبا على بعد نحو ثلاث ساعات.","query":"Manohar International Airport Goa","minutes":"","car":true},
      {"kind":"بنجيم","description":"موقع مهرجان Serendipity في برنامج ديسمبر الأصلي.","query":"Panaji Goa","minutes":"","car":true}
    ],
      checklist: [
      {"text":"التأشيرة الإلكترونية","done":false},
      {"text":"رحلة أقصر من 14 ساعة؟","done":false},
      {"text":"نقل المطار الطويل","done":false}
    ],
      events: "مهرجان Serendipity للفنون في بنجيم يبدأ 13 ديسمبر، يوم رجوعك، وبنجيم بعيدة عن بالوليم",
      post: {}
    }
  ]
  },
  ...newTripGroups
]
};

export function tripCardsWithDefaults(saved?:TripCards):TripCards {
  if (!saved) return initialTripCards;
  const ids = new Set(saved.groups.map(group=>group.id));
  const missing = initialTripCards.groups.filter(group=>!ids.has(group.id));
  return missing.length ? {...saved, groups:[...saved.groups, ...missing]} : saved;
}

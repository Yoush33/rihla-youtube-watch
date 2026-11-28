import type {Profile} from './world';
// Editorial starting points. No visa, price or seasonal rules are inferred from this catalog.
const rows=[
  {
    "code": "SE",
    "places": [
      "ستوكهولم",
      "غوتنبرغ"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدن للتصميم والمتاحف مع مساحات خضراء.",
    "source": "https://visitsweden.com/"
  },
  {
    "code": "FI",
    "places": [
      "هلسنكي",
      "منطقة البحيرات"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء"
    ],
    "summary": "تجارب المدينة والساونا أو إقامة حول البحيرات.",
    "source": "https://www.visitfinland.com/en/"
  },
  {
    "code": "DK",
    "places": [
      "كوبنهاغن",
      "آرهوس"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "عمارة ومتاحف وأحياء للمشي في مدينتين.",
    "source": "https://www.visitdenmark.com/"
  },
  {
    "code": "IE",
    "places": [
      "دبلن",
      "غالواي"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "رحلة تجمع المدينة وقاعدة لاستكشاف الغرب.",
    "source": "https://www.ireland.com/en-us/"
  },
  {
    "code": "BE",
    "places": [
      "بروج",
      "غنت"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "دليل بداية لمدن فلاندرز التاريخية وقنواتها.",
    "source": "https://www.visitflanders.com/en"
  },
  {
    "code": "LU",
    "places": [
      "مدينة لوكسمبورغ",
      "مولرتال"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدينة تاريخية ومنطقة لمسارات الطبيعة.",
    "source": "https://www.visitluxembourg.com/"
  },
  {
    "code": "PL",
    "places": [
      "كراكوف",
      "غدانسك"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن تاريخية وتجارب على ساحل البلطيق.",
    "source": "https://www.poland.travel/en/"
  },
  {
    "code": "CZ",
    "places": [
      "براغ",
      "برنو"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "عمارة ومتاحف وأحياء تاريخية لاستكشافها سيرًا.",
    "source": "https://www.visitczechia.com/"
  },
  {
    "code": "SK",
    "places": [
      "براتيسلافا",
      "جبال تاترا"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "رحلة مدينة أو قاعدة لاستكشاف الجبال.",
    "source": "https://slovakia.travel/en"
  },
  {
    "code": "HU",
    "places": [
      "بودابست",
      "بحيرة بالاتون"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "تجارب العاصمة أو إقامة بجانب البحيرة.",
    "source": "https://visithungary.com/"
  },
  {
    "code": "SI",
    "places": [
      "ليوبليانا",
      "بليد"
    ],
    "tags": [
      "الطبيعة",
      "الثقافة"
    ],
    "summary": "مدينة وقاعدة لاستكشاف البحيرة والطبيعة.",
    "source": "https://www.slovenia.info/en"
  },
  {
    "code": "HR",
    "places": [
      "سبليت",
      "دوبروفنيك"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن ساحلية تاريخية؛ اختر قاعدة قبل إضافة الجزر.",
    "source": "https://croatia.hr/en-gb"
  },
  {
    "code": "BA",
    "places": [
      "سراييفو"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "دليل البداية يركز على سراييفو وتراثها ومحيطها.",
    "source": "https://www.visitsarajevo.ba/"
  },
  {
    "code": "ME",
    "places": [
      "كوتور",
      "بودفا"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن ساحلية وخيارات للتجول حول الخليج.",
    "source": "https://www.montenegro.travel/en"
  },
  {
    "code": "RS",
    "places": [
      "بلغراد",
      "نوفي ساد"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن نهرية ومتاحف وتاريخ محلي.",
    "source": "https://www.serbia.travel/en/"
  },
  {
    "code": "AL",
    "places": [
      "تيرانا",
      "بيرات"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة ومدينة تاريخية كبداية لرحلة داخلية.",
    "source": "https://akt.gov.al/"
  },
  {
    "code": "MK",
    "places": [
      "سكوبيه",
      "أوهريد"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "تجارب المدينة والبحيرة والتراث.",
    "source": "https://macedonia-timeless.com/eng"
  },
  {
    "code": "RO",
    "places": [
      "بوخارست",
      "براشوف"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة وقاعدة لاستكشاف ترانسلفانيا.",
    "source": "https://romania.travel/"
  },
  {
    "code": "BG",
    "places": [
      "صوفيا",
      "بلوفديف"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن تاريخية وتنوع معماري وثقافي.",
    "source": "https://visitbulgaria.com/"
  },
  {
    "code": "EE",
    "places": [
      "تالين",
      "تارتو"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدينتان للتراث والمتاحف والتجول.",
    "source": "https://visitestonia.com/en"
  },
  {
    "code": "LV",
    "places": [
      "ريغا",
      "يورمالا"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "عمارة العاصمة وتجربة ساحلية قريبة نسبيًا.",
    "source": "https://www.latvia.travel/en"
  },
  {
    "code": "LT",
    "places": [
      "فيلنيوس",
      "كاوناس"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "أحياء قديمة ومتاحف وتجارب حضرية.",
    "source": "https://lithuania.travel/en"
  },
  {
    "code": "CY",
    "places": [
      "بافوس",
      "لارنكا"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن ساحلية تجمع التراث والاسترخاء.",
    "source": "https://www.visitcyprus.com/"
  },
  {
    "code": "MT",
    "places": [
      "فاليتا",
      "غوزو"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "تراث العاصمة وجزيرة لتجربة أهدأ.",
    "source": "https://www.visitmalta.com/en/"
  },
  {
    "code": "AD",
    "places": [
      "أندورا لا فيلا",
      "أوردينو"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة",
      "التسوق"
    ],
    "summary": "بلد جبلي مع بلدات وتسوق ومسارات طبيعة.",
    "source": "https://visitandorra.com/en/"
  },
  {
    "code": "SM",
    "places": [
      "مدينة سان مارينو"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "قاعدة واحدة لاستكشاف المركز التاريخي.",
    "source": "https://www.visitsanmarino.com/"
  },
  {
    "code": "MC",
    "places": [
      "موناكو",
      "مونت كارلو"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "رحلة حضرية ساحلية؛ مونت كارلو حي داخل موناكو.",
    "source": "https://www.visitmonaco.com/"
  },
  {
    "code": "LI",
    "places": [
      "فادوتس",
      "مالبون"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة أو قاعدة جبلية؛ اختر حسب التجربة.",
    "source": "https://en.tourismus.li/"
  },
  {
    "code": "KR",
    "places": [
      "سيول",
      "بوسان"
    ],
    "tags": [
      "الثقافة",
      "التسوق"
    ],
    "summary": "تجارب العاصمة ومدينة ساحلية؛ اترك وقتًا للانتقال.",
    "source": "https://english.visitkorea.or.kr/svc/main/index.do"
  },
  {
    "code": "CN",
    "places": [
      "بكين",
      "شنغهاي"
    ],
    "tags": [
      "الثقافة",
      "التسوق"
    ],
    "summary": "مدينتان مختلفتان للتراث والحياة الحضرية.",
    "source": "https://www.travelchina.org.cn/en"
  },
  {
    "code": "VN",
    "places": [
      "هانوي",
      "هوي آن"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدن تاريخية وتجارب محلية في منطقتين مختلفتين.",
    "source": "https://vietnam.travel/"
  },
  {
    "code": "KH",
    "places": [
      "سييم ريب",
      "بنوم بنه"
    ],
    "tags": [
      "الثقافة",
      "المغامرة"
    ],
    "summary": "قاعدة للتراث الأثري وتجارب العاصمة.",
    "source": "https://www.tourism.gov.kh/"
  },
  {
    "code": "LA",
    "places": [
      "لوانغ برابانغ",
      "فيينتيان"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدن نهرية وتراث ومعالم طبيعية حولها.",
    "source": "https://www.tourismlaos.org/"
  },
  {
    "code": "NP",
    "places": [
      "كاتماندو",
      "بوخارا"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "تجارب ثقافية وقاعدة لاستكشاف الطبيعة.",
    "source": "https://ntb.gov.np/"
  },
  {
    "code": "BT",
    "places": [
      "بارو",
      "تيمفو"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "أودية ومدن جبلية وثقافة محلية.",
    "source": "https://bhutan.travel/"
  },
  {
    "code": "IN",
    "places": [
      "دلهي",
      "جايبور"
    ],
    "tags": [
      "الثقافة",
      "التسوق"
    ],
    "summary": "دليل بداية لمدن شمال الهند وتراثها.",
    "source": "https://www.incredibleindia.gov.in/en"
  },
  {
    "code": "LK",
    "places": [
      "كاندي",
      "غالي"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "تجربة داخلية وأخرى ساحلية؛ راجع المسار بينهما.",
    "source": "https://www.srilanka.travel/"
  },
  {
    "code": "PH",
    "places": [
      "مانيلا",
      "بالاوان"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء"
    ],
    "summary": "قاعدة مدينة ومنطقة جزر؛ حدد الجزيرة قبل الإقامة.",
    "source": "https://philippines.travel/"
  },
  {
    "code": "BN",
    "places": [
      "بندر سري بكاوان",
      "تمبورونغ"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة أو تجربة الغابات ضمن منطقة تمبورونغ.",
    "source": "https://www.bruneitourism.com/"
  },
  {
    "code": "MN",
    "places": [
      "أولان باتور",
      "صحراء غوبي"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة",
      "الثقافة"
    ],
    "summary": "تجربة مدينة ومساحات طبيعية واسعة.",
    "source": "https://www.gomongolia.gov.mn/explore-experience/"
  },
  {
    "code": "KZ",
    "places": [
      "ألماتي",
      "أستانا"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدينتان وقاعدة للتجارب الطبيعية حول ألماتي.",
    "source": "https://kazakhstan.travel/en"
  },
  {
    "code": "UZ",
    "places": [
      "سمرقند",
      "بخارى"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن تراثية ومعالم مرتبطة بطريق الحرير.",
    "source": "https://uzbekistan.travel/en/"
  },
  {
    "code": "KG",
    "places": [
      "بشكيك",
      "إيسيك كول"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "العاصمة ومنطقة بحيرة ضمن بلد جبلي.",
    "source": "https://tourism.gov.kg/"
  },
  {
    "code": "TJ",
    "places": [
      "دوشنبه",
      "جبال فان"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "مدينة ورحلة جبلية تحتاج ترتيبًا مستقلًا.",
    "source": "https://traveltajikistan.tj/"
  },
  {
    "code": "AM",
    "places": [
      "يريفان",
      "ديليجان"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة وقاعدة للتجول وسط الطبيعة.",
    "source": "https://armenia.travel/"
  },
  {
    "code": "TW",
    "places": [
      "تايبيه",
      "تاينان"
    ],
    "tags": [
      "الثقافة",
      "التسوق"
    ],
    "summary": "مدن للمتاحف والتراث وتجارب الأحياء.",
    "source": "https://eng.taiwan.net.tw/"
  },
  {
    "code": "TN",
    "places": [
      "تونس",
      "جربة"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "العاصمة وتراثها أو إقامة جزيرية ساحلية.",
    "source": "https://www.discovertunisia.com/"
  },
  {
    "code": "DZ",
    "places": [
      "الجزائر العاصمة",
      "قسنطينة"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن تاريخية كبداية لاستكشاف الشمال.",
    "source": "https://www.mta.gov.dz/"
  },
  {
    "code": "ZA",
    "places": [
      "كيب تاون",
      "جوهانسبرغ"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "تجارب حضرية وقواعد لرحلات إقليمية مختلفة.",
    "source": "https://www.southafrica.net/us/en/"
  },
  {
    "code": "NA",
    "places": [
      "ويندهوك",
      "سواكوبموند"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "العاصمة ومدينة ساحلية لبدء مسار صحراوي.",
    "source": "https://visitnamibia.com.na/"
  },
  {
    "code": "BW",
    "places": [
      "ماون",
      "كاساني"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "قاعدتان لرحلات الحياة البرية؛ حدد المحمية والمشغل.",
    "source": "https://www.botswanatourism.co.bw/"
  },
  {
    "code": "ZM",
    "places": [
      "ليفينغستون",
      "لوساكا"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "قاعدة للشلالات وتجارب العاصمة.",
    "source": "https://www.zambia.travel/"
  },
  {
    "code": "ZW",
    "places": [
      "فيكتوريا فولز",
      "هراري"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "مدينة الشلالات أو العاصمة ضمن مسارين مختلفين.",
    "source": "https://zimbabwetourism.net/en/"
  },
  {
    "code": "TZ",
    "places": [
      "أروشا",
      "زنجبار"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء",
      "المغامرة"
    ],
    "summary": "قاعدة للسفاري أو إقامة جزيرية؛ خطط للنقل بينهما.",
    "source": "https://tanzaniatourism.go.tz/"
  },
  {
    "code": "KE",
    "places": [
      "نيروبي",
      "مومباسا"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء"
    ],
    "summary": "العاصمة أو الساحل مع خيارات لرحلات مستقلة.",
    "source": "https://magicalkenya.com/"
  },
  {
    "code": "UG",
    "places": [
      "كمبالا",
      "جينجا"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "تجربة المدينة ومنطقة النيل؛ اختر نشاطك ومشغله.",
    "source": "https://exploreuganda.com/"
  },
  {
    "code": "RW",
    "places": [
      "كيغالي",
      "موسانزي"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة وقاعدة لرحلات الطبيعة المنظمة.",
    "source": "https://visitrwanda.com/"
  },
  {
    "code": "ET",
    "places": [
      "أديس أبابا",
      "غوندار"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "تجارب ثقافية وتاريخية في منطقتين.",
    "source": "https://visitethiopia.et/"
  },
  {
    "code": "GH",
    "places": [
      "أكرا",
      "كيب كوست"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدن ساحلية وتراث وتجارب ثقافية.",
    "source": "https://visitghana.com/"
  },
  {
    "code": "SN",
    "places": [
      "داكار",
      "سان لويس"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن ساحلية وتراث موسيقي ومعماري.",
    "source": "https://www.visitezlesenegal.com/"
  },
  {
    "code": "CV",
    "places": [
      "سال",
      "سانتياغو"
    ],
    "tags": [
      "الاسترخاء",
      "الثقافة"
    ],
    "summary": "جزيرتان لتجارب مختلفة؛ اختر الجزيرة قبل الحجز.",
    "source": "https://www.visit-caboverde.com/"
  },
  {
    "code": "SC",
    "places": [
      "ماهي",
      "براسلين"
    ],
    "tags": [
      "الاسترخاء",
      "الطبيعة"
    ],
    "summary": "إقامة جزيرية وطبيعة؛ راجع النقل بين الجزيرتين.",
    "source": "https://seychelles.com/"
  },
  {
    "code": "MG",
    "places": [
      "أنتاناناريفو",
      "نوسي بي"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء"
    ],
    "summary": "العاصمة أو تجربة جزيرية في الشمال.",
    "source": "https://madagascar-tourisme.com/fr/"
  },
  {
    "code": "MZ",
    "places": [
      "مابوتو",
      "فيلانكولوس"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "تجربة المدينة أو قاعدة لرحلات الساحل والجزر.",
    "source": "https://inatur.gov.mz/"
  },
  {
    "code": "US",
    "places": [
      "نيويورك",
      "واشنطن"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "مدن للمتاحف والتجارب الحضرية في شرق البلاد.",
    "source": "https://www.visittheusa.com/"
  },
  {
    "code": "CA",
    "places": [
      "مونتريال",
      "مدينة كيبيك"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "دليل بداية لمدينتين في إقليم كيبيك.",
    "source": "https://travel.destinationcanada.com/en-ca"
  },
  {
    "code": "MX",
    "places": [
      "مكسيكو سيتي",
      "أواكساكا"
    ],
    "tags": [
      "الثقافة",
      "العائلة"
    ],
    "summary": "تراث ومتاحف وتجارب محلية في مدينتين.",
    "source": "https://visitmexico.com/"
  },
  {
    "code": "CR",
    "places": [
      "سان خوسيه",
      "لا فورتونا"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "مدينة وقاعدة للتجارب الطبيعية.",
    "source": "https://www.visitcostarica.com/"
  },
  {
    "code": "PA",
    "places": [
      "مدينة بنما",
      "بوكاس ديل تورو"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدينة ومنطقة جزر تتطلب خطة انتقال.",
    "source": "https://www.tourismpanama.com/"
  },
  {
    "code": "GT",
    "places": [
      "أنتيغوا",
      "بحيرة أتيتلان"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدينة تاريخية وقاعدة حول البحيرة.",
    "source": "https://www.visitguatemala.com/"
  },
  {
    "code": "BZ",
    "places": [
      "سان إغناسيو",
      "سان بيدرو"
    ],
    "tags": [
      "الطبيعة",
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "تجربة داخلية للتراث والطبيعة وأخرى ساحلية.",
    "source": "https://www.travelbelize.org/"
  },
  {
    "code": "CU",
    "places": [
      "هافانا",
      "ترينيداد"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن للتراث المعماري والتجارب المحلية.",
    "source": "https://www.cubatravel.cu/"
  },
  {
    "code": "DO",
    "places": [
      "سانتو دومينغو",
      "بونتا كانا"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "العاصمة التاريخية أو إقامة ساحلية.",
    "source": "https://www.godominicanrepublic.com/"
  },
  {
    "code": "JM",
    "places": [
      "كينغستون",
      "مونتيغو باي"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدينة للموسيقى والثقافة ومنطقة ساحلية.",
    "source": "https://www.visitjamaica.com/"
  },
  {
    "code": "BS",
    "places": [
      "ناساو",
      "إكسوما"
    ],
    "tags": [
      "الاسترخاء",
      "الطبيعة"
    ],
    "summary": "العاصمة أو أرخبيل لتجربة الجزر.",
    "source": "https://www.bahamas.com/"
  },
  {
    "code": "BB",
    "places": [
      "بريدجتاون",
      "الساحل الغربي"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "تراث العاصمة ومناطق للإقامة الساحلية.",
    "source": "https://www.visitbarbados.org/"
  },
  {
    "code": "BR",
    "places": [
      "ريو دي جانيرو",
      "سلفادور"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن ساحلية بثقافات وتجارب مختلفة.",
    "source": "https://visitbrasil.com/"
  },
  {
    "code": "AR",
    "places": [
      "بوينس آيرس",
      "مندوزا"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدينة وتوجه نحو منطقة الأنديز؛ راجع الانتقال.",
    "source": "https://www.argentina.travel/"
  },
  {
    "code": "CL",
    "places": [
      "سانتياغو",
      "سان بيدرو دي أتاكاما"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "العاصمة وقاعدة صحراوية في الشمال.",
    "source": "https://chile.travel/"
  },
  {
    "code": "PE",
    "places": [
      "ليما",
      "كوسكو"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "العاصمة وتراث منطقة الأنديز.",
    "source": "https://www.peru.travel/"
  },
  {
    "code": "CO",
    "places": [
      "بوغوتا",
      "قرطاجنة"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "مدن في المرتفعات والساحل بتجارب مختلفة.",
    "source": "https://colombia.travel/"
  },
  {
    "code": "EC",
    "places": [
      "كيتو",
      "كوينكا"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة"
    ],
    "summary": "مدن تاريخية في منطقة الأنديز.",
    "source": "https://ecuador.travel/"
  },
  {
    "code": "UY",
    "places": [
      "مونتيفيديو",
      "كولونيا ديل ساكرامنتو"
    ],
    "tags": [
      "الثقافة",
      "الاسترخاء"
    ],
    "summary": "العاصمة ومدينة تاريخية قرب نهر لابلاتا.",
    "source": "https://uruguaynatural.com/"
  },
  {
    "code": "BO",
    "places": [
      "لاباز",
      "أويوني"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "مدينة وقاعدة لاستكشاف المسطحات الملحية.",
    "source": "https://conocebolivia.turismoyculturas.gob.bo/inicio/"
  },
  {
    "code": "AU",
    "places": [
      "سيدني",
      "ملبورن"
    ],
    "tags": [
      "الثقافة",
      "الطبيعة",
      "العائلة"
    ],
    "summary": "مدينتان وقواعد لرحلات إقليمية؛ المسافات كبيرة.",
    "source": "https://www.australia.com/en"
  },
  {
    "code": "NZ",
    "places": [
      "أوكلاند",
      "كوينزتاون"
    ],
    "tags": [
      "الطبيعة",
      "المغامرة"
    ],
    "summary": "قاعدتان في جزيرتين مختلفتين تتطلبان وقت انتقال.",
    "source": "https://www.newzealand.com/int/"
  },
  {
    "code": "FJ",
    "places": [
      "نادي",
      "جزر مامانوكا"
    ],
    "tags": [
      "الاسترخاء",
      "الطبيعة"
    ],
    "summary": "قاعدة وصول ومنطقة جزر؛ حدد الجزيرة والإقامة.",
    "source": "https://www.fiji.travel/"
  },
  {
    "code": "WS",
    "places": [
      "أبيا",
      "سافاي"
    ],
    "tags": [
      "الاسترخاء",
      "الثقافة"
    ],
    "summary": "العاصمة وتجربة جزيرة أخرى؛ راجع الربط بينهما.",
    "source": "https://www.samoa.travel/"
  },
  {
    "code": "TO",
    "places": [
      "نوكو ألوفا",
      "فافاو"
    ],
    "tags": [
      "الاسترخاء",
      "الطبيعة"
    ],
    "summary": "مدينة وقاعدة جزرية مستقلة؛ راجع وسائل الانتقال.",
    "source": "https://www.thekingdomoftonga.com/"
  },
  {
    "code": "VU",
    "places": [
      "بورت فيلا",
      "إسبيريتو سانتو"
    ],
    "tags": [
      "الطبيعة",
      "الاسترخاء"
    ],
    "summary": "قاعدتان في جزيرتين لرحلات الطبيعة والساحل.",
    "source": "https://www.vanuatu.travel/en/"
  }
];
const unreadable=new Set(["HR","RO","MC","TW","ZA","ZW","TZ","KE","SC","MG","MX","GT","CU","AR","CO","EC","UY","FJ","TO"]);
export const additionalProfiles:Record<string,Profile>=Object.fromEntries(rows.map(({code,...row})=>[code,{...row,coverage:'basic',reviewedAt:'2026-09-25',sourceNote:unreadable.has(code)?'تعذر الاطلاع على محتوى البوابة أثناء المراجعة؛ الرابط للاستكمال، والمدن اقتراحات تحريرية تحتاج تحققًا.':'راجعنا بوابة السياحة؛ المدن التالية نقاط بداية تحريرية، وليست برنامجًا موثقًا بكل تفاصيله.',season:'لم نوثق أفضل الأشهر لهذه المناطق بعد. لا تتوفر توقعات طقس مرتبطة بموعدك في هذا الدليل.',months:[],scope:'دليل بداية: مدن ومناطق مقترحة للتخطيط. المواسم والتكلفة ومتطلبات الدخول تحتاج مراجعة منفصلة.',seasonSource:row.source,caution:'لا تفترض قرب المناطق من بعضها. تحقق من مسار النقل وساعات الزيارة والأسعار وقيود السفر الرسمية قبل اعتماد الخطة.'}]));

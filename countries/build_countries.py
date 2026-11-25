"""يبني ملف لكل دولة في countries/list.json: معلومات أساسية، تأشيرة الجواز السعودي، إجازات رسمية،
طقس شهري (متوسط 10 سنوات) وأفضل الشهور. يشتغل على GitHub Actions مرة بالشهر.

المصادر: mledoze/countries (GitHub)، ilyankou/passport-index-dataset (GitHub)،
Nager.Date (الإجازات)، Open-Meteo Historical Weather API (الطقس، CC BY 4.0).
"""
import csv, io, json, time, urllib.error, urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "data"
TODAY = date.today().isoformat()
YEARS = (2021, 2025)  # 5 سنوات تكفي للمتوسط وتبقى داخل حد Open-Meteo المجاني
MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
SRC = {
    "wc": "mledoze/countries",
    "visa": "passport-index-dataset (ilyankou)",
    "hol": "Nager.Date",
    "wx": f"Open-Meteo، متوسط {YEARS[0]}–{YEARS[1]}",
}


class RateLimited(Exception):
    pass


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "rihla-countries/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code == 429:  # وصلنا الحد المجاني: لا نكرر
                raise RateLimited(url)
            if i == tries - 1:
                raise
        except Exception:
            if i == tries - 1:
                raise
        time.sleep(10 * (i + 1))


def visa_label(raw):
    if not raw:
        return "غير موجود في البيانات", "unknown", None
    if raw.isdigit():
        return f"بدون تأشيرة حتى {raw} يوم", "visa_free", int(raw)
    m = {"visa free": ("بدون تأشيرة", "visa_free"), "visa on arrival": ("تأشيرة عند الوصول", "on_arrival"),
         "e-visa": ("تأشيرة إلكترونية قبل السفر", "e_visa"), "eta": ("تصريح إلكتروني (ETA) قبل السفر", "eta"),
         "visa required": ("تأشيرة مسبقة من السفارة", "required"), "no admission": ("الدخول غير مسموح", "no_admission"),
         "-1": ("بلدك نفسه", "home")}.get(raw.lower(), (raw, "other"))
    return m[0], m[1], None


def climate(lat, lon):
    url = ("https://archive-api.open-meteo.com/v1/archive?"
           f"latitude={lat}&longitude={lon}&start_date={YEARS[0]}-01-01&end_date={YEARS[1]}-12-31"
           "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto")
    d = json.loads(get(url))["daily"]
    agg = defaultdict(lambda: {"tmax": [], "tmin": [], "rain_days": defaultdict(int), "rain_mm": defaultdict(float)})
    for day, hi, lo, pr in zip(d["time"], d["temperature_2m_max"], d["temperature_2m_min"], d["precipitation_sum"]):
        y, m = int(day[:4]), int(day[5:7])
        a = agg[m]
        if hi is not None: a["tmax"].append(hi)
        if lo is not None: a["tmin"].append(lo)
        if pr is not None:
            a["rain_mm"][y] += pr
            if pr >= 1: a["rain_days"][y] += 1
    out = []
    for m in range(1, 13):
        a = agg[m]
        yrs = max(len(a["rain_mm"]), 1)
        tmax = round(sum(a["tmax"]) / len(a["tmax"]), 1)
        tmin = round(sum(a["tmin"]) / len(a["tmin"]), 1)
        rd = round(sum(a["rain_days"].values()) / yrs, 1)
        mm = round(sum(a["rain_mm"].values()) / yrs)
        out.append({"month": m, "name": MONTHS[m - 1], "tmax": tmax, "tmin": tmin, "rain_days": rd, "rain_mm": mm,
                    "fit": fit(tmax, mm)})
    return out


def fit(tmax, rain_mm):
    """تقدير عام: «ممتاز» حرارة عظمى 18–31 ومطر ≤110 ملم بالشهر، «مقبول» 13–34 ومطر ≤190 ملم.
    نعتمد الملم لا عدد الأيام، لأن بيانات إعادة التحليل تحسب الرذاذ يوم ممطر."""
    if 18 <= tmax <= 31 and rain_mm <= 110:
        return "ممتاز"
    if 13 <= tmax <= 34 and rain_mm <= 190:
        return "مقبول"
    return "غير مناسب"


def main():
    lst = json.loads((HERE / "list.json").read_text(encoding="utf-8"))["countries"]
    manual = json.loads((HERE / "manual.json").read_text(encoding="utf-8"))
    wc = {c["cca2"]: c for c in json.loads(get("https://raw.githubusercontent.com/mledoze/countries/master/countries.json"))}
    visa = {}
    for row in csv.reader(io.StringIO(get("https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv"))):
        if row and row[0] == "SA":
            visa[row[1]] = row[2]
    OUT.mkdir(exist_ok=True)
    allc, errors = [], []
    weather_off = False
    for c in lst:
        iso = c["iso"]
        w = wc.get(iso, {})
        label, code, days = visa_label(visa.get(iso))
        hol = []
        for y in (2026, 2027):
            try:
                hol += [{"date": h["date"], "name": h.get("localName") or h["name"]} for h in json.loads(get(f"https://date.nager.at/api/v3/PublicHolidays/{y}/{iso}"))]
            except Exception:
                pass
        try:
            if weather_off:
                raise RateLimited("تخطيت بعد الوصول للحد")
            wx = climate(c["lat"], c["lon"])
        except Exception as e:
            if isinstance(e, RateLimited):
                weather_off = True
            prev = OUT / f"{iso}.json"
            wx = json.loads(prev.read_text(encoding="utf-8"))["weather"]["months"] if prev.exists() else []
            for x in wx:
                x["fit"] = fit(x["tmax"], x["rain_mm"])
            errors.append(f"{iso} طقس: {e}" + (" (استخدمت النسخة السابقة)" if wx else ""))
        m = manual.get(iso, {})
        rec = {
            "iso2": iso,
            "name_ar": (w.get("translations", {}).get("ara", {}) or {}).get("common") or w.get("name", {}).get("common", iso),
            "name_en": w.get("name", {}).get("common", iso),
            "region_rihla": c["region"],
            "updated": TODAY,
            "static": {
                "capital": {"value": w.get("capital", []), "source": SRC["wc"]},
                "currencies": {"value": [f"{k} ({v.get('name')})" for k, v in (w.get("currencies") or {}).items()], "source": SRC["wc"]},
                "languages": {"value": list((w.get("languages") or {}).values()), "source": SRC["wc"]},
                "calling_code": {"value": ((w.get("idd") or {}).get("root", "") + ("".join((w.get("idd") or {}).get("suffixes", [])[:1]))) or None, "source": SRC["wc"]},
            },
            "visa_saudi_passport": {"value": label, "code": code, "days": days, "raw": visa.get(iso),
                                    "source": SRC["visa"], "checked": TODAY,
                                    "status": "مؤشر — تحقق من الموقع الرسمي قبل الحجز", "official": m.get("visa_official")},
            "public_holidays": {"value": hol, "source": SRC["hol"], "checked": TODAY},
            "weather": {"city": c["city"], "lat": c["lat"], "lon": c["lon"], "months": wx, "source": SRC["wx"],
                        "note": "مدينة وحدة تمثّل الدولة. «ممتاز/مقبول» تقدير عام حسب الحرارة العظمى وكمية المطر. المطر في المناطق الاستوائية غالبًا زخات قصيرة."},
            "best_months": [x["name"] for x in wx if x["fit"] == "ممتاز"],
            "ok_months": [x["name"] for x in wx if x["fit"] == "مقبول"],
            "manual": m.get("notes", []),
        }
        (OUT / f"{iso}.json").write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding="utf-8")
        allc.append(rec)
        time.sleep(3)
    (OUT / "all.json").write_text(json.dumps(allc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"دول: {len(allc)} · أخطاء: {len(errors)}")
    for e in errors:
        print(" -", e)


if __name__ == "__main__":
    main()

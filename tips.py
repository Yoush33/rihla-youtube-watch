"""يستخرج نصايح عملية بالعربي من مقاطع يوتيوب عبر Gemini API (يشوف المقطع نفسه من الرابط).

يحفظ النتيجة في حقل tips_ar لكل مقطع داخل data/youtube-candidates.json
يحتاج GEMINI_API_KEY من Google AI Studio (الخطة المجانية تكفي، بدون فوترة).
"""
import json
import os
import pathlib
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).parent
STORE = HERE / "data" / "youtube-candidates.json"
BASE = "https://generativelanguage.googleapis.com/v1beta/"
MINUTES_PER_RUN = 300      # 5 ساعات فيديو بكل تشغيل، تحت حد اليوم المجاني
KEY = os.environ.get("GEMINI_API_KEY", "")

PROMPT = """أنت تساعد مسافر سعودي من الرياض يحب رحلات الاستجمام: سكن واحد يمشي منه للفطور والطبيعة والعشاء والمساج.
شاهد المقطع واستخرج النصايح العملية اللي قالها صاحب المقطع فعلًا عن الوجهة: {dest}.
لا تخترع شي ما انقال في المقطع. إذا المقطع مو عن هذي الوجهة، رجّع tips فاضية.

رجّع JSON بهذا الشكل بالضبط:
{{"about_destination": true/false,
  "summary": "سطرين بالعربي عن المقطع",
  "tips": [{{"type": "أكل|سكن|مساج|طبيعة|تنقل|سعر|تحذير|عام",
             "tip": "النصيحة بجملة وحدة بالعربي",
             "place": "اسم المكان إذا انذكر وإلا فاضي",
             "price": "السعر إذا انذكر بعملته وإلا فاضي",
             "at": "وقتها في المقطع مثل 03:15"}}],
  "verdict": "تنصح فيها الوجهة لمسافر يبي استجمام؟ جملة وحدة"}}
أقصى شي 8 نصايح، الأهم أول."""


def pick_model():
    want = os.environ.get("GEMINI_MODEL")
    if want:
        return want
    with urllib.request.urlopen(BASE + "models?pageSize=200&key=" + KEY, timeout=30) as r:
        models = json.load(r).get("models", [])
    names = [m["name"].split("/")[-1] for m in models
             if "generateContent" in m.get("supportedGenerationMethods", [])]
    flash = [n for n in names if "flash" in n and not any(x in n for x in
             ("lite", "image", "live", "tts", "audio", "exp", "thinking", "preview"))]
    flash = flash or [n for n in names if "flash" in n]
    return sorted(flash)[-1]


def ask(model, url, dest):
    body = {"contents": [{"parts": [{"file_data": {"file_uri": url}},
                                    {"text": PROMPT.format(dest=dest)}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}
    req = urllib.request.Request(f"{BASE}models/{model}:generateContent?key={KEY}",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        out = json.load(r)
    text = out["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def main():
    if not KEY:
        print("ما فيه GEMINI_API_KEY، تخطيت النصايح")
        return
    store = json.loads(STORE.read_text(encoding="utf-8"))
    todo = [v for v in store["videos"].values()
            if v.get("status") != "ما ينفع" and "tips_ar" not in v and not v.get("tips_error")]
    todo.sort(key=lambda v: -v.get("views", 0))
    model = pick_model()
    print("الموديل:", model)
    used = done = failed = 0
    for v in todo:
        mins = v.get("minutes", 15)
        if used + mins > MINUTES_PER_RUN:
            continue
        dest = "، ".join(v.get("destinations") or []) or "الوجهة المذكورة في العنوان"
        try:
            v["tips_ar"] = ask(model, v["url"], dest)
            v["tips_model"] = model
            used += mins
            done += 1
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")[:200]
            if e.code == 429:
                print("وصلنا حد اليوم، نكمل التشغيل الجاي")
                break
            v["tips_error"] = f"{e.code}: {msg}"
            failed += 1
        except Exception as e:  # مقطع واحد ما يوقف الباقي
            v["tips_error"] = str(e)[:200]
            failed += 1
        STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(6)
    left = sum(1 for v in store["videos"].values()
               if v.get("status") != "ما ينفع" and "tips_ar" not in v and not v.get("tips_error"))
    print(f"نصايح جديدة: {done} · فشل: {failed} · دقائق: {round(used)} · باقي: {left}")


if __name__ == "__main__":
    main()

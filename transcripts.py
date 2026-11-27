"""يسحب نص كلام المقاطع (الترجمة المكتوبة من يوتيوب) ويحفظه في data/transcripts/<id>.txt

أبو جبت يقرأ هذي الملفات كل جمعة ويستخرج منها النصايح للبطاقات.
ما يحتاج مفتاح. إذا يوتيوب حجب الطلب، يوقف بهدوء ويكمل الأسبوع الجاي.
"""
import json
import pathlib
import sys
import time

from youtube_transcript_api import YouTubeTranscriptApi

HERE = pathlib.Path(__file__).parent
STORE = HERE / "data" / "youtube-candidates.json"
OUT = HERE / "data" / "transcripts"
PER_RUN = 40          # حد أعلى لكل تشغيل عشان ما ينحجب
MAX_CHARS = 20000     # يكفي للنصايح ويخلي الملف خفيف
LANGS = ["ar", "en"]


def main():
    store = json.loads(STORE.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    api = YouTubeTranscriptApi()
    todo = [v for k, v in store["videos"].items()
            if v.get("status") != "ما ينفع" and not v.get("transcript")
            and not v.get("transcript_missing")]
    todo.sort(key=lambda v: -v.get("views", 0))
    got = missing = blocked = 0
    for v in todo[:PER_RUN]:
        vid = v["video_id"]
        try:
            t = api.fetch(vid, languages=LANGS)
            text = " ".join(s.text.replace("\n", " ") for s in t)[:MAX_CHARS]
            (OUT / f"{vid}.txt").write_text(text, encoding="utf-8")
            v["transcript"] = f"data/transcripts/{vid}.txt"
            v["transcript_lang"] = t.language_code
            got += 1
        except Exception as e:
            name = type(e).__name__
            if name in ("RequestBlocked", "IpBlocked", "TooManyRequests", "YouTubeRequestFailed"):
                blocked += 1
                print("يوتيوب حجب الطلب:", name)
                break
            v["transcript_missing"] = name  # ما له نص، لا تعيد المحاولة
            missing += 1
        time.sleep(2)
    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"نصوص جديدة: {got} · بدون نص: {missing} · حجب: {blocked} · باقي: {max(0, len(todo) - PER_RUN)}")
    if blocked and not got:
        sys.exit(0)


if __name__ == "__main__":
    main()

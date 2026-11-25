"""يقرأ RSS قنوات يوتيوب المختارة ويحفظ الفيديوهات اللي تذكر وجهات «رِحلة».

التشغيل: python watch.py
المدخلات: channels.json و destinations.json
المخرجات: data/youtube-candidates.json (ما يكرر فيديو، ويحافظ على تقييمك status)
"""
import json, os, re, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import timedelta
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "data" / "youtube-candidates.json"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
FEED = "https://www.youtube.com/feeds/videos.xml?channel_id={}"


def load(p, default):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def parse_feed(xml_text, channel_name):
    root = ET.fromstring(xml_text)
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        desc = e.find("media:group/media:description", NS)
        yield {
            "video_id": vid,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "title": e.findtext("a:title", default="", namespaces=NS),
            "description": (desc.text or "") if desc is not None else "",
            "published": e.findtext("a:published", default="", namespaces=NS)[:10],
            "channel": channel_name,
        }


L = r"\w\u0600-\u06FF"  # حروف لاتينية وعربية
PREFIX = r"(?:[وبلفك]|ال|وال|بال|لل)?"  # وأنطاليا، بماليزيا، لتايلند


def word_re(w):
    return re.compile(rf"(?<![{L}]){PREFIX}{re.escape(w.lower())}(?![{L}])")


def match(video, dests):
    """يطابق الكلمة كاملة، عشان «غوا» ما تمسك «غواتيمالا»."""
    text = (video["title"] + " " + video["description"]).lower()
    return [k for k, d in dests.items() if any(word_re(w).search(text) for w in d["keywords"])]


# ── بحث يوتيوب (يحتاج YOUTUBE_API_KEY في أسرار GitHub) ──
API = "https://www.googleapis.com/youtube/v3/"
PER_DEST = 5          # أفضل كم مقطع لكل وجهة
MIN_MINUTES = 5       # يستبعد الشورتس
MIN_VIEWS = 5000
YEARS_BACK = 2


def api(path, **params):
    params["key"] = os.environ["YOUTUBE_API_KEY"]
    url = API + path + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def minutes(iso):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    h, mi, se = (int(x or 0) for x in m.groups()) if m else (0, 0, 0)
    return h * 60 + mi + se / 60


def search_destinations(dests, store):
    after = (datetime.now(timezone.utc) - timedelta(days=365 * YEARS_BACK)).strftime("%Y-%m-%dT%H:%M:%SZ")
    added = 0
    for key, d in dests.items():
        q = d["keywords"][0] + " سفر"
        res = api("search", part="id", q=q, type="video", maxResults=25, relevanceLanguage="ar",
                  publishedAfter=after, order="relevance")
        ids = [i["id"]["videoId"] for i in res.get("items", [])]
        if not ids:
            continue
        info = api("videos", part="snippet,contentDetails,statistics", id=",".join(ids))
        good = []
        for v in info.get("items", []):
            sn, st = v["snippet"], v.get("statistics", {})
            views = int(st.get("viewCount", 0))
            if minutes(v["contentDetails"].get("duration")) < MIN_MINUTES or views < MIN_VIEWS:
                continue
            rec = {"video_id": v["id"], "url": f"https://www.youtube.com/watch?v={v['id']}",
                   "title": sn["title"], "description": sn.get("description", "")[:1500],
                   "published": sn["publishedAt"][:10], "channel": sn["channelTitle"], "views": views}
            if key not in match(rec, dests):  # لازم الوجهة تنذكر فعلًا
                continue
            good.append(rec)
        for rec in sorted(good, key=lambda r: -r["views"])[:PER_DEST]:
            if rec["video_id"] in store["videos"]:
                continue
            rec.update(destinations=match(rec, dests), status="مرشح للمراجعة", source="بحث",
                       found=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
            store["videos"][rec["video_id"]] = rec
            added += 1
    return added


# ── ترجمة وتلخيص عربي عبر GitHub Models (مجاني بحدود يومية، يستخدم GITHUB_TOKEN) ──
MODELS_URL = "https://models.github.ai/inference/chat/completions"
MODEL = "openai/gpt-4o-mini"
MAX_PER_RUN = 40
PROMPT = ("أنت تساعد مسافر سعودي. من عنوان مقطع يوتيوب ووصفه، أرجع JSON فقط بالمفاتيح: "
          "title_ar (العنوان بالعربي، وإذا هو عربي انسخه)، "
          "summary_ar (سطرين بالعربي: وش المقطع وهل هو تجربة سفر فعلية)، "
          "places (قائمة أسماء أماكن أو فنادق أو مطاعم مذكورة، بالعربي، أو قائمة فاضية)، "
          "is_trip (true إذا المقطع تجربة سفر أو دليل سياحي، false إذا مقلب أو قيادة أو موضوع ثاني). "
          "لا تخترع شي مو موجود في النص.")


def summarize(video):
    body = json.dumps({"model": MODEL, "temperature": 0.2,
                       "response_format": {"type": "json_object"},
                       "messages": [{"role": "system", "content": PROMPT},
                                    {"role": "user", "content": f"العنوان: {video['title']}\nالوصف: {video['description'][:1200]}"}]}).encode()
    req = urllib.request.Request(MODELS_URL, data=body, headers={
        "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.load(r)["choices"][0]["message"]["content"]
    return json.loads(out)


def translate_new(store):
    done = 0
    for v in store["videos"].values():
        if done >= MAX_PER_RUN:
            break
        if "summary_ar" in v or v.get("status") == "ما ينفع":
            continue
        try:
            r = summarize(v)
        except Exception as e:
            print("الترجمة توقفت:", e)
            break
        v["title_ar"] = r.get("title_ar") or v["title"]
        v["summary_ar"] = r.get("summary_ar", "")
        v["places_ar"] = r.get("places") or []
        if r.get("is_trip") is False and v.get("status") == "مرشح للمراجعة":
            v["status"] = "مستبعد تلقائيًا"
        done += 1
    return done


def main():
    channels = load(HERE / "channels.json", {}).get("channels", [])
    dests = load(HERE / "destinations.json", {})
    store = load(OUT, {"updated": None, "videos": {}})
    added, failed = 0, []
    for ch in channels:
        cid = ch.get("id", "")
        if not cid.startswith("UC") or "x" * 6 in cid:
            continue
        try:
            req = urllib.request.Request(FEED.format(cid), headers={"User-Agent": "rihla-watch/1.0"})
            xml_text = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
        except Exception as e:  # قناة وحدة ما توقف الباقي
            failed.append(f"{ch.get('name')}: {e}")
            continue
        for v in parse_feed(xml_text, ch.get("name", cid)):
            hits = match(v, dests)
            if not hits or v["video_id"] in store["videos"]:
                continue
            v["destinations"] = hits
            v["description"] = v["description"][:1500]
            v["status"] = "مرشح للمراجعة"  # تغيّرها أنت إلى: ينفع / ما ينفع
            v["found"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            store["videos"][v["video_id"]] = v
            added += 1
    if os.environ.get("YOUTUBE_API_KEY"):
        try:
            n = search_destinations(dests, store)
            print(f"من البحث: {n}")
            added += n
        except Exception as e:
            print("البحث فشل:", e)
    else:
        print("ما فيه YOUTUBE_API_KEY، تخطيت البحث")
    if os.environ.get("GITHUB_TOKEN"):
        print(f"تُرجم ولُخّص: {translate_new(store)}")
    store["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"جديد: {added} · المجموع: {len(store['videos'])} · فشل: {len(failed)}")
    for f in failed:
        print("  -", f)
    if channels and failed and len(failed) == len([c for c in channels if c.get('id','').startswith('UC')]):
        sys.exit(1)


if __name__ == "__main__":
    main()

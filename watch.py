"""يقرأ RSS قنوات يوتيوب المختارة ويحفظ الفيديوهات اللي تذكر وجهات «رِحلة».

التشغيل: python watch.py
المدخلات: channels.json و destinations.json
المخرجات: data/youtube-candidates.json (ما يكرر فيديو، ويحافظ على تقييمك status)
"""
import json, re, sys, urllib.request, xml.etree.ElementTree as ET
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

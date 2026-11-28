## مكوّنات مفتوحة المصدر مستخدمة

- dnd-kit (core 6.3.1، sortable 10.0.0، utilities 3.2.2): لترتيب الأنشطة بالسحب ولوحة المفاتيح.
- المصدر: https://github.com/clauderic/dnd-kit
- الترخيص: MIT. النسخة الكاملة محفوظة في licenses/dnd-kit-MIT.txt.

لم يُنسخ مشروع TRIP أو OpenTrip أو Turistar في هذا التحديث. استفادت قرارات تجربة الاستخدام من البحث؛ التكامل البرمجي المضاف هو مكتبة dnd-kit مع مكوّنات الموقع الخاصة.
## Leaflet
Leaflet 1.9.4 — https://github.com/Leaflet/Leaflet — BSD-2-Clause. Full notice: licenses/leaflet-BSD-2-Clause.txt.

Map tiles: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright . Attribution is visible on the map. Browser requests only visible tiles, honors ordinary HTTP caching, and does not provide offline tile downloads. Policy: https://operations.osmfoundation.org/policies/tiles/ . Map data is community maintained, not an official tourism dataset. Activity coordinates are user supplied.

Ready-plan place data is © OpenStreetMap contributors and available under the Open Database License. The place records in `lib/plans.json` come from the Overpass API and link to the source feature. License and attribution information is available at https://www.openstreetmap.org/copyright .

## World atlas
- world-atlas 2.0.2 and topojson-client 3.1.0: ISC, Michael Bostock. Full licenses in public/licenses.
- Boundaries: Natural Earth public-domain dataset (via world-atlas), https://www.naturalearthdata.com/about/terms-of-use/ .
- world-countries 5.1.0 by mledoze and contributors: ODbL 1.0, https://github.com/mledoze/countries . Derived catalog (Arabic/English names, ISO IDs, centers) is provided in public/countries.json under the same ODbL license, with public/licenses/world-countries.txt. Regenerate using scripts/build-world.mjs.
- Curated tourism and visa summaries are separate original Arabic editorial records with official source URLs; not part of the geographic database.

## Browser inference

WebLLM (@mlc-ai/web-llm 0.2.85), Apache-2.0: https://github.com/mlc-ai/web-llm
Qwen3 1.7B and 4B, Apache-2.0: https://huggingface.co/Qwen/Qwen3-4B
MLC model conversions downloaded only after user activation: https://huggingface.co/mlc-ai
Original model weights are not bundled in the site archive.

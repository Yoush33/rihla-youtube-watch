'use client';

import {useRef,useState} from 'react';
import {useCatalog} from './catalog-context';
import {parseCatalogFile} from '../lib/catalog-import';
import type {CatalogImports} from '../lib/catalog-import-schema';

export function CatalogImportPanel({canSave, onImport}: {canSave:boolean;onImport:(imports:CatalogImports)=>boolean}) {
  const {countries,imports} = useCatalog();
  const [pending,setPending] = useState<CatalogImports>();
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [reading,setReading] = useState(false);
  const selection = useRef(0);

  async function read(files:File[]) {
    const version = ++selection.current;
    setPending(undefined);
    setError('');
    setMessage('');
    setReading(files.length > 0);
    if (!files.length) return;
    try {
      if (files.length > 3 || new Set(files.map(file=>file.name)).size !== files.length) {
        throw Error('اختر نسخة واحدة من كل ملف، بحد أقصى ثلاثة ملفات.');
      }
      if (files.some(file=>file.size > 12_000_000)) throw Error('أحد الملفات يتجاوز ١٢ ميغابايت.');
      const parts = await Promise.all(files.map(async file=>parseCatalogFile(file.name,await file.text())));
      if (selection.current === version) setPending(Object.assign({},...parts));
    } catch (cause) {
      if (selection.current === version) setError(cause instanceof Error ? cause.message : 'تعذّر قراءة الملفات.');
    } finally {
      if (selection.current === version) setReading(false);
    }
  }

  return <section className="panel catalog-import" aria-labelledby="catalog-update-title">
    <h2 id="catalog-update-title">تحديث بيانات رِحلة</h2>
    <p>الكتالوج الحالي · {countries.size} دولة{imports?.combos && ' · ' + imports.combos.length + ' خطة مستوردة'}{imports?.youtube && ' · مقاطع لقطة ' + imports.youtube.updated}</p>
    <p>اختر ملفات النتائج اللي تطلع من المستودع. تقدر تحدّث ملف واحد أو أكثر.</p>
    <ul>
      <li>الدول والمناخ والعطلات <bdi>all.json</bdi></li>
      <li>الخطط المركبة <bdi>combos.json</bdi></li>
      <li>مقاطع «كلام الناس» <bdi>youtube-candidates.json</bdi></li>
    </ul>
    <form onSubmit={event=>{
      event.preventDefault();
      if (!canSave || !pending || reading) return;
      if (onImport(pending)) {
        setMessage('تبين البيانات الجديدة في وضع الطفش والأدلة. تابع حالة الحفظ أعلى الصفحة.');
        setPending(undefined);
        event.currentTarget.reset();
      }
    }}>
      <label>ملفات النتائج بصيغة JSON
        <input type="file" accept=".json,application/json" multiple disabled={!canSave}
          onChange={event=>void read(Array.from(event.currentTarget.files ?? []))}/>
      </label>
      {reading && <p role="status">جارٍ فحص الملفات…</p>}
      {pending && <p role="status">جاهز للاستيراد · {[
        pending.countries && pending.countries.length + ' دولة',
        pending.combos && pending.combos.length + ' خطة',
        pending.youtube && pending.youtube.videos.length + ' مقطع',
      ].filter(Boolean).join(' · ')}</p>}
      <button type="submit" className="secondary" disabled={!canSave || !pending || reading}>استورد البيانات</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}

import {useCatalog} from './catalog-context';
import {countryPackage} from '../lib/country-package';
import {combosForMonth, type TravelCombo} from '../lib/travel-combos';
import {isRouteExcluded, type DestinationExclusion} from '../lib/destination-exclusions';
import {PlaceImage} from './place-image';

const linkedStops = new Map([
  ['طرابزون وأوزنجول',['طرابزون','أوزنجول']],
  ['كاندي وإيلا',['كاندي','إيلا']],
  ['غرناطة وإشبيلية',['غرناطة','إشبيلية']],
]);

function stopPlaces(stop:string) {
  const names = stop.replace(/\s*\([^()]+\)\s*$/, '').trim();
  return (names || stop).split(/\s+(?:أو|و)\s+|\s*[←→]\s*/).filter(Boolean)
    .flatMap(name => linkedStops.get(name) ?? [name]);
}

function ComboDetails({combo, openCountry}: {combo:TravelCombo;openCountry:(code:string) => void}) {
  const {countries} = useCatalog();
  const countryCodes = new Map(Array.from(countries.values(), ({iso2,name_ar}) => [name_ar,iso2]));
  return <>
    <div className="travel-combo-countries">{combo.countries.map(code => <button type="button" key={code} className="secondary"
      onClick={() => openCountry(code)}>{countryPackage(code,countries)?.name_ar ?? code}</button>)}</div>
    <h4>توزيع الليالي</h4>
    <ol className="travel-combo-route">{combo.route.map((stop,index) => <li key={index}>
      <p>{stop}</p>
      <div className="travel-combo-photos">
        {stopPlaces(stop).map((name,placeIndex) => {
          const code = countryCodes.get(name);
          return <PlaceImage key={placeIndex} place={code ?? name} kind={code ? 'country' : 'city'}
            className="travel-combo-photo" label={name}/>;
        })}
      </div>
    </li>)}</ol>
    <h4>التنقل</h4>
    <ul>{combo.links.map(link => <li key={link}>{link}</li>)}</ul>
    <p><strong>الدخول والخروج</strong> · {combo.fly}</p>
    <p><strong>أفضل الشهور</strong> · {combo.best.join('، ')}</p>
    <p><strong>وش تنتبه له</strong> · {combo.watch}</p>
  </>;
}

export function TravelCombos({days, month, openCountry, exclusions}: {
  days:number;month:number;openCountry:(code:string) => void;exclusions?:readonly DestinationExclusion[];
}) {
  const {countries,imports} = useCatalog();
  if (days < 7) return null;
  const options = combosForMonth(days,month,countries,imports?.combos).filter(combo => !isRouteExcluded(combo,exclusions));
  return <section className="panel travel-combos">
    <h2>خطط سفر مركبة</h2>
    {options.length ? <p>مسارات متعددة المدن أو الدول. التكلفة تحتاج تسعير لكل مسار.</p> :
      <p>ما فيه خطة مركبة تناسب الشهر المختار حسب الكتالوج.</p>}
    {options.map(combo => <details key={combo.id}>
      <summary><strong>{combo.name}</strong> · {combo.days} أيام{combo.preferred && ' · من أفضل شهورها'}{!combo.durationFits && ' · المدة المقترحة تختلف عن اختيارك'}</summary>
      <ComboDetails combo={combo} openCountry={openCountry}/>
    </details>)}
  </section>;
}

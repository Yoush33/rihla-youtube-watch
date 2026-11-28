import fs from 'node:fs';
import {createRequire} from 'node:module';
import {feature} from 'topojson-client';
const require=createRequire(import.meta.url);
const countries=require('world-countries').map(c=>({code:c.cca2,id:c.ccn3,name:c.translations.ara?.common||c.name.common,en:c.name.common,lat:c.latlng[0],lng:c.latlng[1]}));
const names={MX:'المكسيك',RS:'صربيا',UZ:'أوزبكستان',MK:'مقدونيا الشمالية',CG:'جمهورية الكونغو',CD:'جمهورية الكونغو الديمقراطية',GF:'غويانا الفرنسية',PR:'بورتوريكو',TH:'تايلاند',ME:'الجبل الأسود',MD:'مولدوفا'};
for(const c of countries)if(names[c.code])c.name=names[c.code];
const topology=require('world-atlas/countries-50m.json');
const geo=feature(topology,topology.objects.countries);
for(const f of geo.features){const c=countries.find(c=>c.id&&c.id===f.id);f.properties={code:c?.code||'',name:c?.name||f.properties.name};
 // Topology joins can give an eastern antimeridian vertex longitude -180.
 // Restore its ring's side to avoid drawing Russia or Fiji across the world.
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const polygon of polygons)for(const ring of polygon){const interior=ring.filter(p=>Math.abs(p[0])<179.999);if(interior.length&&interior.every(p=>p[0]>0))for(const p of ring)if(p[0]===-180)p[0]=180;}
}
fs.writeFileSync('public/world.json',JSON.stringify(geo));
fs.writeFileSync('public/countries.json',JSON.stringify(countries));
fs.writeFileSync('lib/country-codes.ts','// Catalog derived from world-countries 5.1.0; ODbL. See public/countries.json and licenses.\nexport const countryCodes='+JSON.stringify(countries.map(c=>c.code))+';\n');
fs.mkdirSync('public/licenses',{recursive:true});
for(const name of ['world-countries','world-atlas','topojson-client'])fs.copyFileSync('node_modules/'+name+'/LICENSE','public/licenses/'+name+'.txt');
console.log(countries.length+' catalog entries; '+geo.features.length+' map features');

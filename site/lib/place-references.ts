import {placeUpdateKnowledge} from './place-review-updates';
import {communityKnowledge} from './community-knowledge';
import {reliabilityKnowledge} from './reliability-knowledge';
import {cityDepthKnowledge} from './city-depth';
import {findPlace,unifiedPlaceKnowledge} from './place-catalog';
import type {KnowledgeCard} from './knowledge';
export type PlaceReference={card:KnowledgeCard;relation:'place'|'city'|'country'};
export function placeReferences(id:string):PlaceReference[]{
 const p=findPlace(id);if(!p)return [];
 const city=p.city==='بكين'?'beijing':p.city==='شنغهاي'?'shanghai':p.city;
 const direct=[...placeUpdateKnowledge,...reliabilityKnowledge,...cityDepthKnowledge,...unifiedPlaceKnowledge].filter(c=>c.venueId===id).map(card=>({card,relation:'place' as const}));
 const context=communityKnowledge.filter(c=>c.code===p.country&&(!c.city||c.city===city)).map(card=>({card,relation:card.city?'city' as const:'country' as const}));
 return [...direct,...context];
}

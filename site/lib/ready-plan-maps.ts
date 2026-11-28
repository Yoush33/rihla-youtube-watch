import type {ReadyPlan} from './ready-plan-schema';
import {walkMap} from './trip-card';

type Stop = ReadyPlan['stops'][number];
type Place = Stop['places'][number];
type Coordinates = {latitude?:number; longitude?:number};
type VerifiedPlace = Place & {latitude:number; longitude:number; osm_url:string; distance_meters:number};

function coordinatesQuery({latitude,longitude}:Coordinates) {
  return latitude !== undefined && longitude !== undefined ? latitude + ',' + longitude : undefined;
}

export function verifiedReadyPlaces(stop:Stop) {
  if (!coordinatesQuery(stop.hotel)) return [];
  return stop.places.filter((place):place is VerifiedPlace => Boolean(
    coordinatesQuery(place) && place.osm_url && place.distance_meters !== undefined && place.distance_meters <= 5000
  ));
}

export function readyPlaceMap(place:VerifiedPlace) {
  return walkMap(place.latitude + ',' + place.longitude);
}

export function readyHotelMap(stop:Stop) {
  const point = coordinatesQuery(stop.hotel);
  if (point) return walkMap(point);
  const name = stop.hotel.name_en ?? stop.hotel.name;
  if (!/\p{Script=Latin}/u.test(name) || /\p{Script=Arabic}/u.test(name) ||
    /^(?:hotels?|hostels?|resorts?|accommodation)(?:$|\s+(?:near|in|around)\b)/iu.test(name)) return undefined;
  return walkMap(name + ', ' + stop.city);
}

function cityPoints(stop:Stop) {
  const places = verifiedReadyPlaces(stop);
  if (!places.length) return [];
  const points = places.map(place=>place.latitude + ',' + place.longitude);
  const hotel = coordinatesQuery(stop.hotel);
  if (hotel) points.unshift(hotel);
  return [...new Set(points)];
}

function directions(points:string[]) {
  if (points.length < 2) return walkMap(points[0]);
  const origin = points[0];
  const destination = points[points.length - 1];
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',origin,destination,waypoints:points.slice(1,-1).join('|')});
}

export function readyCityMap(stop:Stop) {
  const points = cityPoints(stop);
  return points.length ? directions(points.slice(0,11)) : undefined;
}

export function readyCityMapParts(stop:Stop) {
  const points = cityPoints(stop);
  if (points.length <= 5) return [];
  // Mobile browsers accept three waypoints. The endpoint links adjacent parts.
  return Array.from({length:Math.ceil((points.length - 1) / 4)},(_,index)=>directions(points.slice(index * 4,index * 4 + 5)));
}

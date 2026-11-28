'use client';

import {createContext,useContext} from 'react';
import {catalogWithImports,type CountryCatalog} from '../lib/country-catalog';
import type {CatalogImports} from '../lib/catalog-import-schema';
import type {OnYoutubeReview} from '../lib/youtube-watch';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';

export const CatalogContext = createContext<{
  countries:CountryCatalog;
  imports?:CatalogImports;
  youtubeReviews?:YoutubeReviews;
  onYoutubeReview?:OnYoutubeReview;
}>({countries:catalogWithImports()});
export const useCatalog = () => useContext(CatalogContext);

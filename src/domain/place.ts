import type { PlaceId, WorkspaceId } from './ids';

export interface Place {
  id: PlaceId;
  workspaceId: WorkspaceId;
  name: string;
  localName?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: {
    country?: string;
    prefecture?: string;
    city?: string;
  };
  providerIds?: {
    osm?: string;
    google?: string;
  };
  urls?: {
    official?: string;
    map?: string;
  };
}

export interface PlaceReference {
  placeId: PlaceId;
  role: 'primary' | 'origin' | 'destination' | 'stop';
}
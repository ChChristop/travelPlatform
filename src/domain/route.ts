import type { RouteId, PlaceId, PlanVersionId } from './ids';

export type RouteMode = 'walk' | 'train' | 'bus' | 'taxi' | 'car' | 'flight' | 'mixed';

export interface RouteLeg {
  fromPlaceId: PlaceId;
  toPlaceId: PlaceId;
  mode: RouteMode;
  durationMinutes?: number;
  distanceMeters?: number;
  geometry?: unknown;
}

export interface Route {
  id: RouteId;
  planVersionId: PlanVersionId;
  fromPlaceId: PlaceId;
  toPlaceId: PlaceId;
  mode: RouteMode;
  plannedDurationMinutes?: number;
  distanceMeters?: number;
  geometry?: unknown;
  legs?: RouteLeg[];
}

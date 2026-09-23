import { migrate } from '../domain/migrations/migrate.ts';
import { events, todos } from '../data/trip.js';

/**
 * @returns {import('./types.js').DataSourceResult}
 */
export function getPlatformState() {
  try {
    const input = {
      events: events,
      todos: todos,
    };
    const result = migrate(input);
    const seed = result.seed;

    const state = {
      projects: [seed.project],
      planVersions: [seed.planVersion],
      planItems: seed.planItems,
      places: seed.places,
      bookings: seed.bookings,
      costRecords: [],
      routes: [],
      tasks: seed.tasks,
      planFragments: [],
      planOptions: [],
      optionGroups: [],
      scenarios: [],
      constraints: [],
      tripRuns: [],
      itemExecutions: [],
    };

    return { state, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { state: null, error: message };
  }
}

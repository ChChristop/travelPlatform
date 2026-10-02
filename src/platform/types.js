/**
 * @typedef {import('../store/entities/state.ts').EntityState} EntityState
 * @typedef {import('../domain/plan.ts').PlanItem} PlanItem
 * @typedef {import('../domain/place.ts').Place} Place
 * @typedef {import('../domain/project.ts').TravelProject} TravelProject
 * @typedef {import('../store/commands/option.ts').PreviewState} PreviewState
 * @typedef {import('../store/commands/option.ts').CreateOptionGroupInput} CreateOptionGroupInput
 * @typedef {import('../store/commands/option.ts').ActiveState} ActiveState
 */

/**
 * @typedef {Object} PlatformViewProps
 * @property {EntityState} state
 * @property {string} timezone
 * @property {string | null} selectedItemId
 * @property {(id: string) => void} onSelectItem
 */

/**
 * @typedef {Object} DataSourceResult
 * @property {EntityState | null} state
 * @property {string | null} error
 */

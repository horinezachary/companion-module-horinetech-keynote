import type { StateMessage, TriggerMessage } from './protocol.js'
import type { VariablesSchema } from './variables.js'

/** Labels match ignoring case and surrounding whitespace, as the app does. */
export function labelKey(label: string): string {
	return label.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** Accepts `CAM1` or `[CAM1]` in option fields. */
export function cleanLabelOption(value: unknown): string {
	const s = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
	return labelKey(s.trim().replace(/^\[/, '').replace(/\]$/, ''))
}

export function slideHasLabel(state: StateMessage, label: unknown): boolean {
	const key = cleanLabelOption(label)
	return key !== '' && state.labels.some((l) => labelKey(l) === key)
}

export interface FiredLabel {
	trigger: TriggerMessage
	at: number
}

/** Remembers when each label last fired, for "label fired" feedbacks. */
export class FiredLabels {
	#byKey = new Map<string, FiredLabel>()
	#last: FiredLabel | null = null
	#count = 0

	record(trigger: TriggerMessage, at = Date.now()): void {
		const fired = { trigger, at }
		this.#byKey.set(labelKey(trigger.label), fired)
		this.#last = fired
		this.#count++
	}

	get last(): FiredLabel | null {
		return this.#last
	}

	get count(): number {
		return this.#count
	}

	/** Whether `label` (or any label, if empty) fired within the last `holdMs`. */
	firedWithin(label: unknown, holdMs: number, now = Date.now()): boolean {
		const key = cleanLabelOption(label)
		const fired = key ? this.#byKey.get(key) : this.#last
		return !!fired && now - fired.at < holdMs
	}

	/** Most recent fire time of any label. */
	get lastAt(): number {
		return this.#last?.at ?? 0
	}
}

export function variableValues(state: StateMessage, connected: boolean, fired: FiredLabels): VariablesSchema {
	const last = fired.last?.trigger
	return {
		connected,
		keynote_running: state.keynoteRunning,
		playing: state.playing,
		document: state.document,
		slide: state.slide,
		slide_count: state.slideCount,
		slide_display: state.slide > 0 ? `${state.slide} / ${state.slideCount}` : '',
		slides_remaining: state.slide > 0 ? Math.max(state.slideCount - state.slide, 0) : 0,
		notes: state.notes,
		notes_plain: state.notesPlain,
		labels: state.labels.join(', '),
		label_count: state.labels.length,
		last_label: last?.label ?? '',
		last_label_slide: last?.slide ?? 0,
		last_label_direction: last?.direction ?? '',
		trigger_count: fired.count,
	}
}

import type ModuleInstance from './main.js'
import type { StartFrom } from './protocol.js'

type NoOptions = { options: Record<string, never> }

export type ActionsSchema = {
	next: NoOptions
	previous: NoOptions
	first: NoOptions
	last: NoOptions
	goto: { options: { slide: number } }
	start: { options: { from: StartFrom; slide: number } }
	stop: NoOptions
	refresh: NoOptions
}

/** Slide numbers from options may arrive as strings when they come from an expression. */
export function toSlideNumber(value: unknown): number | null {
	const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim() || NaN) : NaN
	return Number.isInteger(n) && n >= 1 ? n : null
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		next: {
			name: 'Next',
			description: 'Advance the slideshow (next build or slide)',
			options: [],
			callback: () => self.sendCommand({ cmd: 'next' }),
		},
		previous: {
			name: 'Previous',
			options: [],
			callback: () => self.sendCommand({ cmd: 'previous' }),
		},
		first: {
			name: 'First slide',
			options: [],
			callback: () => self.sendCommand({ cmd: 'first' }),
		},
		last: {
			name: 'Last slide',
			options: [],
			callback: () => self.sendCommand({ cmd: 'last' }),
		},
		goto: {
			name: 'Go to slide',
			options: [
				{
					id: 'slide',
					type: 'number',
					label: 'Slide number',
					default: 1,
					min: 1,
					max: 10000,
					asInteger: true,
				},
			],
			callback: (action) => {
				const slide = toSlideNumber(action.options.slide)
				if (slide === null) {
					self.log('warn', `Go to slide: "${String(action.options.slide)}" is not a slide number`)
					return
				}
				self.sendCommand({ cmd: 'goto', slide })
			},
		},
		start: {
			name: 'Start slideshow',
			options: [
				{
					id: 'from',
					type: 'dropdown',
					label: 'Start from',
					default: 'beginning',
					choices: [
						{ id: 'beginning', label: 'The beginning' },
						{ id: 'current', label: 'The current slide' },
						{ id: 'slide', label: 'A slide number' },
					],
				},
				{
					id: 'slide',
					type: 'number',
					label: 'Slide number',
					default: 1,
					min: 1,
					max: 10000,
					asInteger: true,
					isVisibleExpression: `$(options:from) == 'slide'`,
				},
			],
			callback: (action) => {
				const from = action.options.from
				if (from === 'slide') {
					const slide = toSlideNumber(action.options.slide)
					if (slide === null) return
					self.sendCommand({ cmd: 'start', from, slide })
				} else {
					self.sendCommand({ cmd: 'start', from: from === 'current' ? 'current' : 'beginning' })
				}
			},
		},
		stop: {
			name: 'Stop slideshow',
			options: [],
			callback: () => self.sendCommand({ cmd: 'stop' }),
		},
		refresh: {
			name: 'Refresh state',
			description: 'Ask the app to resend the current slide state',
			options: [],
			callback: () => self.sendCommand({ cmd: 'refresh' }),
		},
	})
}

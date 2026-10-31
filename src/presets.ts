import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'

const BLACK = 0x000000
const WHITE = 0xffffff
const GREEN = 0x00a000
const RED = 0xc00000

export function UpdatePresets(self: ModuleInstance): void {
	const v = (name: string): string => `$(${self.label}:${name})`

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'control',
			name: 'Slide control',
			definitions: [
				{
					id: 'control',
					name: 'Slide control',
					type: 'simple',
					presets: ['previous', 'next', 'first', 'last', 'start', 'start_current', 'stop'],
				},
			],
		},
		{
			id: 'status',
			name: 'Status',
			definitions: [
				{
					id: 'status',
					name: 'Status',
					type: 'simple',
					presets: ['slide', 'last_label', 'connection'],
				},
			],
		},
	]

	const style = (text: string, size: 'auto' | '14' | '18' | '24' = 'auto') => ({
		text,
		size,
		color: WHITE,
		bgcolor: BLACK,
		show_topbar: false,
	})

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		previous: {
			type: 'simple',
			name: 'Previous',
			style: style('◀ Prev', '18'),
			steps: [{ down: [{ actionId: 'previous', options: {} }], up: [] }],
			feedbacks: [],
		},
		next: {
			type: 'simple',
			name: 'Next',
			style: style('Next ▶', '18'),
			steps: [{ down: [{ actionId: 'next', options: {} }], up: [] }],
			feedbacks: [],
		},
		first: {
			type: 'simple',
			name: 'First slide',
			style: style('First', '18'),
			steps: [{ down: [{ actionId: 'first', options: {} }], up: [] }],
			feedbacks: [],
		},
		last: {
			type: 'simple',
			name: 'Last slide',
			style: style('Last', '18'),
			steps: [{ down: [{ actionId: 'last', options: {} }], up: [] }],
			feedbacks: [],
		},
		start: {
			type: 'simple',
			name: 'Play from the beginning',
			style: style('Play\\nfrom start', '14'),
			steps: [{ down: [{ actionId: 'start', options: { from: 'beginning', slide: 1 } }], up: [] }],
			feedbacks: [{ feedbackId: 'playing', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		start_current: {
			type: 'simple',
			name: 'Play from the current slide',
			style: style('Play\\nfrom here', '14'),
			steps: [{ down: [{ actionId: 'start', options: { from: 'current', slide: 1 } }], up: [] }],
			feedbacks: [{ feedbackId: 'playing', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		stop: {
			type: 'simple',
			name: 'Stop slideshow',
			style: style('Stop', '18'),
			steps: [{ down: [{ actionId: 'stop', options: {} }], up: [] }],
			feedbacks: [],
		},
		slide: {
			type: 'simple',
			name: 'Current slide',
			style: style(`Slide\\n${v('slide_display')}`, '18'),
			steps: [],
			feedbacks: [{ feedbackId: 'playing', options: {}, style: { bgcolor: RED, color: WHITE } }],
		},
		last_label: {
			type: 'simple',
			name: 'Last label fired',
			style: style(`Cue\\n${v('last_label')}`, '14'),
			steps: [],
			feedbacks: [
				{ feedbackId: 'label_fired', options: { label: '', hold: 1 }, style: { bgcolor: GREEN, color: WHITE } },
			],
		},
		connection: {
			type: 'simple',
			name: 'Connection status',
			style: { ...style('Keynote', '14'), bgcolor: RED },
			steps: [],
			feedbacks: [{ feedbackId: 'connected', options: {}, style: { bgcolor: GREEN, color: WHITE } }],
		},
	}

	self.setPresetDefinitions(structure, presets)
}

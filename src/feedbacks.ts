import type ModuleInstance from './main.js'
import { slideHasLabel } from './state.js'

export type FeedbacksSchema = {
	connected: { type: 'boolean'; options: Record<string, never> }
	playing: { type: 'boolean'; options: Record<string, never> }
	current_slide: { type: 'boolean'; options: { slide: number } }
	slide_has_label: { type: 'boolean'; options: { label: string } }
	label_fired: { type: 'boolean'; options: { label: string; hold: number } }
}

const GREEN = 0x00a000
const RED = 0xc00000
const WHITE = 0xffffff
const AMBER = 0xd08000

/** The longest hold a "label fired" feedback can ask for, in seconds. */
export const MAX_HOLD_SECONDS = 60

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		connected: {
			type: 'boolean',
			name: 'Connected to the Mac app',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => self.client?.connected ?? false,
		},
		playing: {
			type: 'boolean',
			name: 'Slideshow is playing',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => self.slideState.playing,
		},
		current_slide: {
			type: 'boolean',
			name: 'Current slide is',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [{ id: 'slide', type: 'number', label: 'Slide number', default: 1, min: 1, max: 10000 }],
			callback: (fb) => self.slideState.slide > 0 && self.slideState.slide === Number(fb.options.slide),
		},
		slide_has_label: {
			type: 'boolean',
			name: 'Current slide has label',
			description: 'True while the slide on screen carries this [LABEL] in its notes',
			defaultStyle: { bgcolor: AMBER, color: WHITE },
			options: [{ id: 'label', type: 'textinput', label: 'Label, e.g. CAM1', default: '' }],
			callback: (fb) => slideHasLabel(self.slideState, fb.options.label),
		},
		label_fired: {
			type: 'boolean',
			name: 'Label fired',
			description:
				'True for a moment after the app fires this label. Use it as a Trigger condition to run actions when a slide with the label is shown. Leave the label empty to match any label.',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{ id: 'label', type: 'textinput', label: 'Label, e.g. CAM1 (empty for any)', default: '' },
				{
					id: 'hold',
					type: 'number',
					label: 'Stay true for (seconds)',
					default: 1,
					min: 0.1,
					max: MAX_HOLD_SECONDS,
					step: 0.1,
				},
			],
			callback: (fb) => self.fired.firedWithin(fb.options.label, Number(fb.options.hold) * 1000),
		},
	})
}

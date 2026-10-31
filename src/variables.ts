import type ModuleInstance from './main.js'

export type VariablesSchema = {
	connected: boolean
	keynote_running: boolean
	playing: boolean
	document: string
	slide: number
	slide_count: number
	slide_display: string
	slides_remaining: number
	notes: string
	notes_plain: string
	labels: string
	label_count: number
	last_label: string
	last_label_slide: number
	last_label_direction: string
	trigger_count: number
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		connected: { name: 'Connected to the Mac app' },
		keynote_running: { name: 'Keynote is running' },
		playing: { name: 'Slideshow is playing' },
		document: { name: 'Presentation name' },
		slide: { name: 'Current slide number' },
		slide_count: { name: 'Number of slides' },
		slide_display: { name: 'Slide as "5 / 40"' },
		slides_remaining: { name: 'Slides after the current one' },
		notes: { name: 'Presenter notes, with tags' },
		notes_plain: { name: 'Presenter notes, without tags' },
		labels: { name: 'Labels on the current slide, comma separated' },
		label_count: { name: 'Number of labels on the current slide' },
		last_label: { name: 'Last label fired' },
		last_label_slide: { name: 'Slide the last label fired on' },
		last_label_direction: { name: 'Direction of the last label fire (forward or backward)' },
		trigger_count: { name: 'Number of labels fired since connecting (changes on every fire)' },
	})
}

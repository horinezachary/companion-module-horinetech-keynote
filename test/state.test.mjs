import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanLabelOption, FiredLabels, slideHasLabel, variableValues } from '../dist/state.js'
import { toSlideNumber } from '../dist/actions.js'
import { EMPTY_STATE } from '../dist/protocol.js'

const state = {
	...EMPTY_STATE,
	keynoteRunning: true,
	playing: true,
	slide: 5,
	slideCount: 40,
	labels: ['CAM1', 'Lights Warm'],
}
const trig = (label, slide = 5) => ({ type: 'trigger', label, slide, index: 0, count: 1, direction: 'forward' })

test('label options accept brackets, case and extra spaces', () => {
	assert.equal(cleanLabelOption(' [cam1] '), 'CAM1')
	assert.equal(cleanLabelOption('lights   warm'), 'LIGHTS WARM')
	assert.equal(cleanLabelOption(undefined), '')
})

test('slideHasLabel matches ignoring case', () => {
	assert.equal(slideHasLabel(state, 'cam1'), true)
	assert.equal(slideHasLabel(state, '[LIGHTS WARM]'), true)
	assert.equal(slideHasLabel(state, 'CAM2'), false)
	assert.equal(slideHasLabel(state, ''), false)
})

test('firedWithin honours the hold time, per label and for any label', () => {
	const f = new FiredLabels()
	assert.equal(f.firedWithin('', 1000, 0), false)
	f.record(trig('CAM1'), 1000)
	assert.equal(f.firedWithin('cam1', 500, 1400), true)
	assert.equal(f.firedWithin('cam1', 500, 1600), false)
	assert.equal(f.firedWithin('CAM2', 500, 1100), false)
	assert.equal(f.firedWithin('', 500, 1100), true)
})

test('variable values', () => {
	const f = new FiredLabels()
	f.record(trig('CAM1'))
	f.record(trig('CAM1'))
	const v = variableValues(state, true, f)
	assert.equal(v.slide_display, '5 / 40')
	assert.equal(v.slides_remaining, 35)
	assert.equal(v.labels, 'CAM1, Lights Warm')
	assert.equal(v.label_count, 2)
	assert.equal(v.last_label, 'CAM1')
	assert.equal(v.trigger_count, 2)
	assert.equal(v.connected, true)
	assert.equal(variableValues(EMPTY_STATE, false, new FiredLabels()).slide_display, '')
})

test('slide numbers from options', () => {
	assert.equal(toSlideNumber(3), 3)
	assert.equal(toSlideNumber(' 12 '), 12)
	assert.equal(toSlideNumber(0), null)
	assert.equal(toSlideNumber(2.5), null)
	assert.equal(toSlideNumber('abc'), null)
	assert.equal(toSlideNumber(undefined), null)
})

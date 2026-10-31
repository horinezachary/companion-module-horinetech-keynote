import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeAppMessage, encodeCommand, encodeHello, LineSplitter } from '../dist/protocol.js'

test('encodes hello with and without a token', () => {
	assert.deepEqual(JSON.parse(encodeHello('')), { type: 'hello', protocol: 1 })
	assert.deepEqual(JSON.parse(encodeHello('s3cret')), { type: 'hello', protocol: 1, token: 's3cret' })
	assert.ok(encodeHello('').endsWith('\n'))
})

test('encodes commands as one line', () => {
	assert.equal(encodeCommand({ cmd: 'goto', slide: 4 }), '{"type":"cmd","cmd":"goto","slide":4}\n')
	assert.equal(encodeCommand({ cmd: 'start', from: 'current' }), '{"type":"cmd","cmd":"start","from":"current"}\n')
})

test('decodes state, filling gaps with defaults', () => {
	const s = decodeAppMessage('{"type":"state","slide":5,"slideCount":40,"labels":["CAM1",3],"playing":true}')
	assert.equal(s.type, 'state')
	assert.equal(s.slide, 5)
	assert.equal(s.playing, true)
	assert.equal(s.keynoteRunning, false)
	assert.deepEqual(s.labels, ['CAM1'])
	assert.equal(s.notes, '')
})

test('decodes trigger and rejects one without a label', () => {
	const t = decodeAppMessage('{"type":"trigger","label":"CAM1","slide":2,"index":0,"count":1,"direction":"backward"}')
	assert.deepEqual(t, { type: 'trigger', label: 'CAM1', slide: 2, index: 0, count: 1, direction: 'backward' })
	assert.equal(decodeAppMessage('{"type":"trigger","slide":2}'), null)
})

test('ignores unknown and malformed lines', () => {
	assert.equal(decodeAppMessage('{"type":"future"}'), null)
	assert.equal(decodeAppMessage('nope'), null)
	assert.equal(decodeAppMessage('[1]'), null)
	assert.equal(decodeAppMessage('null'), null)
})

test('splits lines across chunks and tolerates CRLF', () => {
	const s = new LineSplitter()
	assert.deepEqual(s.push(Buffer.from('{"a":')), [])
	assert.deepEqual(s.push(Buffer.from('1}\r\n{"b":2}\n\n{"c"')), ['{"a":1}', '{"b":2}'])
	assert.deepEqual(s.push(Buffer.from(':3}\n')), ['{"c":3}'])
})

test('drops an over-long line and recovers', () => {
	const s = new LineSplitter(8)
	assert.deepEqual(s.push(Buffer.from('0123456789')), [])
	assert.deepEqual(s.push(Buffer.from('abc\nok\n')), ['ok'])
})

test('keeps multi-byte characters split across chunks intact', () => {
	const s = new LineSplitter()
	const bytes = Buffer.from('{"n":"café"}\n')
	assert.deepEqual(s.push(bytes.subarray(0, 10)), [])
	assert.deepEqual(s.push(bytes.subarray(10)), ['{"n":"café"}'])
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { once } from 'node:events'
import { KeynoteClient } from '../dist/client.js'

/** A stand-in for the Mac app: records lines it receives and lets the test write back. */
async function mockApp({ token = '', greet = true } = {}) {
	const received = []
	const sockets = []
	let connections = 0
	const server = net.createServer((socket) => {
		connections++
		sockets.push(socket)
		let buf = ''
		socket.on('data', (d) => {
			buf += d.toString()
			let i
			while ((i = buf.indexOf('\n')) >= 0) {
				const msg = JSON.parse(buf.slice(0, i))
				buf = buf.slice(i + 1)
				received.push(msg)
				if (msg.type === 'hello' && greet) {
					if (token && msg.token !== token) {
						socket.end('{"type":"error","code":"auth","message":"Wrong or missing token"}\n')
					} else {
						socket.write('{"type":"hello","protocol":1,"app":"KeynoteCompanion","version":"0.1.0"}\n')
						socket.write(
							'{"type":"state","keynoteRunning":true,"playing":true,"document":"Deck","slide":2,"slideCount":9,"notes":"[CAM1]","notesPlain":"","labels":["CAM1"]}\n',
						)
					}
				}
			}
		})
		socket.on('error', () => {})
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	return {
		port: server.address().port,
		received,
		get connections() {
			return connections
		},
		write: (line) => sockets.at(-1).write(line + '\n'),
		dropAll: () => sockets.forEach((s) => s.destroy()),
		close: () => {
			sockets.forEach((s) => s.destroy())
			return new Promise((r) => server.close(r))
		},
	}
}

const waitFor = async (fn, ms = 3000) => {
	const end = Date.now() + ms
	while (!fn()) {
		if (Date.now() > end) throw new Error('timed out')
		await new Promise((r) => setTimeout(r, 10))
	}
}

const fast = { minBackoffMs: 20, maxBackoffMs: 80, helloTimeoutMs: 200, silenceTimeoutMs: 300 }

test('handshakes, receives state and triggers, sends commands', async () => {
	const app = await mockApp()
	const client = new KeynoteClient({ host: '127.0.0.1', port: app.port, ...fast })
	const states = []
	const triggers = []
	client.on('state', (s) => states.push(s))
	client.on('trigger', (t) => triggers.push(t))
	client.start()

	await waitFor(() => states.length === 1)
	assert.equal(client.status, 'connected')
	assert.deepEqual(app.received[0], { type: 'hello', protocol: 1 })
	assert.equal(states[0].slide, 2)

	app.write('{"type":"trigger","label":"CAM1","slide":2,"index":0,"count":1,"direction":"forward"}')
	await waitFor(() => triggers.length === 1)
	assert.equal(triggers[0].label, 'CAM1')

	assert.equal(client.send({ cmd: 'goto', slide: 7 }), true)
	await waitFor(() => app.received.length === 2)
	assert.deepEqual(app.received[1], { type: 'cmd', cmd: 'goto', slide: 7 })

	client.stop()
	assert.equal(client.send({ cmd: 'next' }), false)
	await app.close()
})

test('sends the token and reports a wrong one', async () => {
	const app = await mockApp({ token: 'right' })
	const ok = new KeynoteClient({ host: '127.0.0.1', port: app.port, token: 'right', ...fast })
	ok.start()
	await waitFor(() => ok.connected)
	assert.equal(app.received[0].token, 'right')
	ok.stop()

	const bad = new KeynoteClient({ host: '127.0.0.1', port: app.port, token: 'wrong', ...fast })
	const statuses = []
	bad.on('status', (s) => statuses.push(s))
	bad.start()
	await waitFor(() => statuses.includes('auth_failed'))
	assert.equal(bad.connected, false)
	bad.stop()
	await app.close()
})

test('reconnects after the app drops the connection', async () => {
	const app = await mockApp()
	const client = new KeynoteClient({ host: '127.0.0.1', port: app.port, ...fast })
	client.start()
	await waitFor(() => client.connected)
	app.dropAll()
	await waitFor(() => !client.connected)
	await waitFor(() => client.connected && app.connections === 2)
	client.stop()
	await app.close()
})

test('drops a connection that goes silent, and one that never says hello', async () => {
	const silent = await mockApp()
	const client = new KeynoteClient({ host: '127.0.0.1', port: silent.port, ...fast })
	client.start()
	await waitFor(() => client.connected)
	// No heartbeats from the mock, so the client should give up and reconnect.
	await waitFor(() => silent.connections >= 2, 2000)
	client.stop()
	await silent.close()

	const mute = await mockApp({ greet: false })
	const c2 = new KeynoteClient({ host: '127.0.0.1', port: mute.port, ...fast })
	c2.start()
	await waitFor(() => mute.connections >= 2, 2000)
	assert.equal(c2.connected, false)
	c2.stop()
	await mute.close()
})

test('keeps retrying while the app is not running', async () => {
	const app = await mockApp()
	const port = app.port
	await app.close()
	const client = new KeynoteClient({ host: '127.0.0.1', port, ...fast })
	const statuses = []
	client.on('status', (s) => statuses.push(s))
	client.start()
	await waitFor(() => statuses.filter((s) => s === 'disconnected').length >= 2)
	client.stop()
})

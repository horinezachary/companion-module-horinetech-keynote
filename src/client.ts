import { EventEmitter } from 'node:events'
import net from 'node:net'
import {
	decodeAppMessage,
	encodeCommand,
	encodeHello,
	LineSplitter,
	type Command,
	type HelloMessage,
	type StateMessage,
	type TriggerMessage,
} from './protocol.js'

export type ClientStatus = 'disconnected' | 'connecting' | 'connected' | 'auth_failed'

export interface ClientOptions {
	host: string
	port: number
	token?: string
	/** Silence longer than this drops the connection. The app sends a heartbeat every 2 s. */
	silenceTimeoutMs?: number
	/** How long to wait for the app's hello after connecting. */
	helloTimeoutMs?: number
	minBackoffMs?: number
	maxBackoffMs?: number
}

export interface ClientEvents {
	status: [status: ClientStatus, message: string | undefined]
	hello: [hello: HelloMessage]
	state: [state: StateMessage]
	trigger: [trigger: TriggerMessage]
}

/**
 * Reconnecting TCP client for the Mac app. Has no Companion dependency, so it can be tested
 * against a mock server.
 */
export class KeynoteClient extends EventEmitter<ClientEvents> {
	readonly options: Required<ClientOptions>
	#socket: net.Socket | null = null
	#splitter = new LineSplitter()
	#status: ClientStatus = 'disconnected'
	#greeted = false
	#running = false
	#backoff: number
	#reconnectTimer: NodeJS.Timeout | null = null
	#helloTimer: NodeJS.Timeout | null = null
	#silenceTimer: NodeJS.Timeout | null = null

	constructor(options: ClientOptions) {
		super()
		this.options = {
			token: '',
			silenceTimeoutMs: 8000,
			helloTimeoutMs: 3000,
			minBackoffMs: 1000,
			maxBackoffMs: 10000,
			...options,
		}
		this.#backoff = this.options.minBackoffMs
	}

	get status(): ClientStatus {
		return this.#status
	}

	get connected(): boolean {
		return this.#status === 'connected'
	}

	start(): void {
		if (this.#running) return
		this.#running = true
		this.#connect()
	}

	stop(): void {
		this.#running = false
		this.#clearTimers()
		this.#teardown()
		this.#setStatus('disconnected', undefined)
	}

	/** Sends a command. Returns false if not connected. */
	send(command: Command): boolean {
		if (!this.#socket || !this.connected) return false
		this.#socket.write(encodeCommand(command))
		return true
	}

	#connect(): void {
		if (!this.#running) return
		this.#teardown()
		this.#greeted = false
		this.#splitter.reset()
		if (this.#status !== 'auth_failed') this.#setStatus('connecting', undefined)

		const socket = net.createConnection({ host: this.options.host, port: this.options.port })
		this.#socket = socket
		socket.setNoDelay(true)
		socket.setKeepAlive(true, 5000)

		socket.on('connect', () => {
			socket.write(encodeHello(this.options.token))
			this.#helloTimer = setTimeout(() => this.#drop('No hello from the app'), this.options.helloTimeoutMs)
			this.#touch()
		})
		socket.on('data', (chunk: Buffer) => {
			this.#touch()
			for (const line of this.#splitter.push(chunk)) this.#handleLine(line)
		})
		socket.on('error', (err) => {
			if (this.#status !== 'auth_failed') this.#setStatus('disconnected', err.message)
		})
		socket.on('close', () => {
			if (this.#socket !== socket) return
			this.#socket = null
			this.#clearConnectionTimers()
			if (this.#status === 'connected') this.#setStatus('disconnected', 'Connection closed')
			this.#scheduleReconnect()
		})
	}

	#handleLine(line: string): void {
		const msg = decodeAppMessage(line)
		if (!msg) return
		switch (msg.type) {
			case 'hello':
				if (this.#helloTimer) clearTimeout(this.#helloTimer)
				this.#helloTimer = null
				this.#greeted = true
				this.#backoff = this.options.minBackoffMs
				this.#setStatus('connected', undefined)
				this.emit('hello', msg)
				break
			case 'state':
				if (this.#greeted) this.emit('state', msg)
				break
			case 'trigger':
				if (this.#greeted) this.emit('trigger', msg)
				break
			case 'error':
				if (msg.code === 'auth') {
					this.#setStatus('auth_failed', msg.message || 'Wrong or missing token')
					this.#backoff = this.options.maxBackoffMs
				}
				break
			case 'hb':
				break
		}
	}

	/** Resets the silence timer. */
	#touch(): void {
		if (this.#silenceTimer) clearTimeout(this.#silenceTimer)
		this.#silenceTimer = setTimeout(() => this.#drop('Connection went silent'), this.options.silenceTimeoutMs)
	}

	#drop(reason: string): void {
		if (this.#status !== 'auth_failed') this.#setStatus('disconnected', reason)
		this.#socket?.destroy()
	}

	#scheduleReconnect(): void {
		if (!this.#running || this.#reconnectTimer) return
		const delay = this.#backoff
		this.#backoff = Math.min(this.#backoff * 2, this.options.maxBackoffMs)
		this.#reconnectTimer = setTimeout(() => {
			this.#reconnectTimer = null
			this.#connect()
		}, delay)
	}

	#teardown(): void {
		const socket = this.#socket
		this.#socket = null
		this.#clearConnectionTimers()
		if (socket) {
			socket.removeAllListeners()
			socket.on('error', () => {})
			socket.destroy()
		}
	}

	#clearConnectionTimers(): void {
		if (this.#helloTimer) clearTimeout(this.#helloTimer)
		if (this.#silenceTimer) clearTimeout(this.#silenceTimer)
		this.#helloTimer = null
		this.#silenceTimer = null
	}

	#clearTimers(): void {
		this.#clearConnectionTimers()
		if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer)
		this.#reconnectTimer = null
	}

	#setStatus(status: ClientStatus, message: string | undefined): void {
		if (status === this.#status && message === undefined) return
		this.#status = status
		this.emit('status', status, message)
	}
}

/** Wire protocol between the Keynote Companion Mac app and this module. See PROTOCOL.md. */

export const PROTOCOL_VERSION = 1
export const DEFAULT_PORT = 7878
/** Lines longer than this are discarded. */
export const MAX_LINE_BYTES = 1 << 20

export interface HelloMessage {
	type: 'hello'
	protocol: number
	app?: string
	version?: string
}

export interface StateMessage {
	type: 'state'
	keynoteRunning: boolean
	playing: boolean
	document: string
	slide: number
	slideCount: number
	notes: string
	notesPlain: string
	labels: string[]
}

export type Direction = 'forward' | 'backward'

export interface TriggerMessage {
	type: 'trigger'
	label: string
	slide: number
	index: number
	count: number
	direction: Direction
}

export interface HeartbeatMessage {
	type: 'hb'
}

export interface ErrorMessage {
	type: 'error'
	code: string
	message: string
}

export type AppMessage = HelloMessage | StateMessage | TriggerMessage | HeartbeatMessage | ErrorMessage

export type StartFrom = 'beginning' | 'current' | 'slide'

export type Command =
	| { cmd: 'next' }
	| { cmd: 'previous' }
	| { cmd: 'first' }
	| { cmd: 'last' }
	| { cmd: 'goto'; slide: number }
	| { cmd: 'start'; from: StartFrom; slide?: number }
	| { cmd: 'stop' }
	| { cmd: 'refresh' }

export const EMPTY_STATE: StateMessage = {
	type: 'state',
	keynoteRunning: false,
	playing: false,
	document: '',
	slide: 0,
	slideCount: 0,
	notes: '',
	notesPlain: '',
	labels: [],
}

export function encodeHello(token: string): string {
	const hello: Record<string, unknown> = { type: 'hello', protocol: PROTOCOL_VERSION }
	if (token) hello.token = token
	return JSON.stringify(hello) + '\n'
}

export function encodeCommand(command: Command): string {
	return JSON.stringify({ type: 'cmd', ...command }) + '\n'
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool = (v: unknown): boolean => v === true

/** Decodes one line from the app. Returns null for anything unknown or malformed. */
export function decodeAppMessage(line: string): AppMessage | null {
	let obj: unknown
	try {
		obj = JSON.parse(line)
	} catch {
		return null
	}
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
	const m = obj as Record<string, unknown>

	switch (m.type) {
		case 'hello':
			return { type: 'hello', protocol: num(m.protocol), app: str(m.app), version: str(m.version) }
		case 'state':
			return {
				type: 'state',
				keynoteRunning: bool(m.keynoteRunning),
				playing: bool(m.playing),
				document: str(m.document),
				slide: num(m.slide),
				slideCount: num(m.slideCount),
				notes: str(m.notes),
				notesPlain: str(m.notesPlain),
				labels: Array.isArray(m.labels) ? m.labels.filter((l): l is string => typeof l === 'string') : [],
			}
		case 'trigger':
			if (typeof m.label !== 'string') return null
			return {
				type: 'trigger',
				label: m.label,
				slide: num(m.slide),
				index: num(m.index),
				count: num(m.count, 1),
				direction: m.direction === 'backward' ? 'backward' : 'forward',
			}
		case 'hb':
			return { type: 'hb' }
		case 'error':
			return { type: 'error', code: str(m.code), message: str(m.message) }
		default:
			return null
	}
}

/** Splits a TCP byte stream into lines. Tolerates \r\n and drops over-long lines. */
export class LineSplitter {
	#buffer: Buffer = Buffer.alloc(0)
	#discarding = false

	constructor(readonly maxBytes = MAX_LINE_BYTES) {}

	push(chunk: Buffer): string[] {
		this.#buffer = this.#buffer.length ? Buffer.concat([this.#buffer, chunk]) : chunk
		const lines: string[] = []
		let nl: number
		while ((nl = this.#buffer.indexOf(0x0a)) !== -1) {
			let line = this.#buffer.subarray(0, nl)
			this.#buffer = this.#buffer.subarray(nl + 1)
			if (this.#discarding) {
				this.#discarding = false
				continue
			}
			if (line.length && line[line.length - 1] === 0x0d) line = line.subarray(0, line.length - 1)
			if (line.length && line.length <= this.maxBytes) lines.push(line.toString('utf8'))
		}
		if (this.#buffer.length > this.maxBytes) {
			this.#buffer = Buffer.alloc(0)
			this.#discarding = true
		}
		return lines
	}

	reset(): void {
		this.#buffer = Buffer.alloc(0)
		this.#discarding = false
	}
}

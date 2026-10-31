import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_PORT } from './protocol.js'

export type ModuleConfig = {
	host: string
	port: number
}

export type ModuleSecrets = {
	token?: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Keynote Companion',
			value:
				'Connects to the Keynote Companion menu-bar app on a Mac. The app lists its address and port in its menu. Use 127.0.0.1 if Companion runs on the same Mac.',
			width: 12,
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Mac address',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
		},
		{
			type: 'secret-text',
			id: 'token',
			label: 'Shared token (only if set in the app)',
			width: 8,
		},
	]
}

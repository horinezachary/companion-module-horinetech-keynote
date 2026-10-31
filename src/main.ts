import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { MAX_HOLD_SECONDS, UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { KeynoteClient, type ClientStatus } from './client.js'
import { DEFAULT_PORT, EMPTY_STATE, type Command, type StateMessage, type TriggerMessage } from './protocol.js'
import { FiredLabels, variableValues } from './state.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** How often "label fired" feedbacks are rechecked while a hold might be running out. */
const FIRED_RECHECK_MS = 100

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	client: KeynoteClient | null = null
	slideState: StateMessage = EMPTY_STATE
	fired = new FiredLabels()
	#firedTimer: NodeJS.Timeout | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.#apply(config, secrets)
	}

	async destroy(): Promise<void> {
		this.#stopClient()
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.#apply(config, secrets)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	sendCommand(command: Command): void {
		if (!this.client?.send(command)) {
			this.log('warn', `Not connected to the Mac app, "${command.cmd}" was not sent`)
		}
	}

	#apply(config: ModuleConfig, secrets: ModuleSecrets | undefined): void {
		this.config = config
		this.#stopClient()
		this.slideState = EMPTY_STATE
		this.fired = new FiredLabels()
		this.#publish()

		const host = (config.host ?? '').trim()
		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the Mac address')
			return
		}

		const client = new KeynoteClient({
			host,
			port: Number(config.port) || DEFAULT_PORT,
			token: secrets?.token ?? '',
		})
		client.on('status', (status, message) => this.#onStatus(status, message))
		client.on('hello', (hello) => this.log('info', `Connected to ${hello.app ?? 'app'} ${hello.version ?? ''}`.trim()))
		client.on('state', (state) => this.#onState(state))
		client.on('trigger', (trigger) => this.#onTrigger(trigger))
		this.client = client
		this.updateStatus(InstanceStatus.Connecting)
		client.start()
	}

	#stopClient(): void {
		if (this.#firedTimer) clearInterval(this.#firedTimer)
		this.#firedTimer = null
		if (!this.client) return
		this.client.removeAllListeners()
		this.client.stop()
		this.client = null
	}

	#onStatus(status: ClientStatus, message: string | undefined): void {
		switch (status) {
			case 'connected':
				this.updateStatus(InstanceStatus.Ok)
				break
			case 'connecting':
				this.updateStatus(InstanceStatus.Connecting)
				break
			case 'auth_failed':
				this.updateStatus(InstanceStatus.AuthenticationFailure, message ?? 'Wrong or missing token')
				break
			case 'disconnected':
				this.updateStatus(InstanceStatus.ConnectionFailure, message ?? null)
				break
		}
		if (status !== 'connected') this.slideState = EMPTY_STATE
		this.#publish()
	}

	#onState(state: StateMessage): void {
		this.slideState = state
		this.#publish()
	}

	#onTrigger(trigger: TriggerMessage): void {
		this.fired.record(trigger)
		this.log('debug', `Label fired: [${trigger.label}] on slide ${trigger.slide}`)
		this.#publish()
		this.#watchFired()
	}

	/** Rechecks "label fired" feedbacks until the longest hold has passed. */
	#watchFired(): void {
		if (this.#firedTimer) return
		this.#firedTimer = setInterval(() => {
			this.checkFeedbacks('label_fired')
			if (Date.now() - this.fired.lastAt > MAX_HOLD_SECONDS * 1000 + FIRED_RECHECK_MS) {
				if (this.#firedTimer) clearInterval(this.#firedTimer)
				this.#firedTimer = null
			}
		}, FIRED_RECHECK_MS)
	}

	#publish(): void {
		this.setVariableValues(variableValues(this.slideState, this.client?.connected ?? false, this.fired))
		this.checkFeedbacks('connected', 'playing', 'current_slide', 'slide_has_label', 'label_fired')
	}
}

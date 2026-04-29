import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import type { JsonObject } from 'n8n-workflow';

import { BASE_URL } from './constant';

export class BotPenguinTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BotPenguin Trigger',
		name: 'botPenguinTrigger',
		icon: 'file:botpenguin.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when BotPenguin events occur',
		subtitle: '={{$parameter["eventType"]}}',
		defaults: {
			name: 'BotPenguin Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'botPenguinApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'trigger-event',
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'eventType',
				type: 'options',
				required: true,
				default: 'newLeadHook',
				options: [
					{
						name: 'New Contact Created',
						value: 'newLeadHook',
						description: 'Triggers when a new contact is created in BotPenguin',
					},
					{
						name: 'Incoming Message',
						value: 'newMessageHook',
						description: 'Triggers when there is a new incoming message',
					},
					{
						name: 'WhatsApp Order Created',
						value: 'newOrderHook',
						description: 'Triggers when a new order is placed',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('botPenguinApi');
				if (!credentials) {
					return false;
				}

				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const eventType = this.getNodeParameter('eventType') as string;

				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
					method: 'POST',
					url: `${BASE_URL}/integrations/custom-app/fetch-subscribed-webhooks`,
					body: {
						botId: credentials.botId,
						event: eventType,
						slug: 'n8n',
						category: 'n8n',
					},
					headers: {
						Accept: '*/*',
						'Content-Type': 'application/json',
						authType: 'Key',
					},
					json: true,
				});

				if (response.success && Array.isArray(response.data) && response.data.length > 0) {
					for (const item of response.data) {
						if (item.integrationCredentials && item.integrationCredentials[eventType]) {
							const webhooks = item.integrationCredentials[eventType];
							if (Array.isArray(webhooks)) {
								for (const webhook of webhooks) {
									if (webhook.url === webhookUrl) {
										return true;
									}
								}
							}
						}
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('botPenguinApi');
				if (!credentials) {
					return false;
				}

				const webhookUrl = this.getNodeWebhookUrl('default');
				const eventType = this.getNodeParameter('eventType') as string;

				const body = {
					webhookUrl,
					botId: credentials.botId,
					event: eventType,
					slug: 'n8n',
					category: 'n8n',
					platform: credentials.platform,
					subscribe: true,
				};

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/integrations/custom-app/subscribe-trigger-event`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authType: 'Key',
						},
						json: true,
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('botPenguinApi');
				if (!credentials) {
					return true;
				}

				const webhookUrl = this.getNodeWebhookUrl('default');
				const eventType = this.getNodeParameter('eventType') as string;

				const body = {
					webhookUrl,
					botId: credentials.botId,
					event: eventType,
					slug: 'n8n',
					category: 'n8n',
					platform: credentials.platform,
					subscribe: false,
				};

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/integrations/custom-app/subscribe-trigger-event`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authType: 'Key',
						},
						json: true,
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const eventType = this.getNodeParameter('eventType') as string;

		// Determine output format based on event type
		let output: IDataObject;

		switch (eventType) {
			case 'newLeadHook':
				output = {
					event: 'contact.created',
					app: 'botpenguin',
					botId: body.botId,
					platform: body.platform,
					contact: body.data ?? body,
					timestamp: new Date().toISOString(),
				};
				break;
			case 'newMessageHook':
				output = {
					event: 'message.received',
					app: 'botpenguin',
					botId: body.botId,
					platform: body.platform,
					message: body.data ?? body,
					timestamp: new Date().toISOString(),
				};
				break;
			case 'newOrderHook':
				output = {
					event: 'order.created',
					app: 'botpenguin',
					botId: body.botId,
					platform: body.platform,
					order: body.data ?? body,
					timestamp: new Date().toISOString(),
				};
				break;
			default:
				// Fallback
				output = {
					event: 'unknown',
					app: 'botpenguin',
					botId: body.botId,
					platform: body.platform,
					data: body.data ?? body,
					timestamp: new Date().toISOString(),
				};
		}

		return {
			workflowData: [
				[
					{
						json: output,
					},
				],
			],
		};
	}
}

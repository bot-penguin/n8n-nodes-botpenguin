import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { BASE_URL } from './constant';

export class E1TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BotPenguin Trigger',
		name: 'e1TestTrigger',
		icon: 'file:botpenguin.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when BotPenguin events occur',
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

				this.logger.info(`E1TestTrigger: Checking if webhook exists. Event: ${eventType}, Webhook URL: ${webhookUrl}`);

				try {
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
							Authorization: `Bearer ${credentials.accessToken}`,
						},
						json: true,
					});

					this.logger.info(`E1TestTrigger: Check exists API response: ${JSON.stringify(response)}`);

					// Check if response has data array
					if (response.success && Array.isArray(response.data) && response.data.length > 0) {
						// Look through all items in the data array
						for (const item of response.data) {
							if (item.integrationCredentials && item.integrationCredentials[eventType]) {
								const webhooks = item.integrationCredentials[eventType];
								if (Array.isArray(webhooks)) {
									// Check if any webhook URL matches our current webhook URL
									for (const webhook of webhooks) {
										if (webhook.url === webhookUrl) {
											this.logger.info(`E1TestTrigger: Webhook already exists. URL: ${webhookUrl}`);
											return true;
										}
									}
								}
							}
						}
					}

					this.logger.info(`E1TestTrigger: Webhook does not exist. URL: ${webhookUrl}`);
					return false;
				} catch (error) {
					this.logger.error(`E1TestTrigger: Check exists API failed. Error: ${error}`);
					// If API call fails, assume webhook doesn't exist and let create handle it
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('botPenguinApi');
				if (!credentials) {
					return false;
				}

				const webhookUrl = this.getNodeWebhookUrl('default');
				const eventType = this.getNodeParameter('eventType') as string;

				this.logger.info(`E1TestTrigger: Subscribing to BotPenguin webhook. Event: ${eventType}, Webhook URL: ${webhookUrl}`);

				const body = {
					webhookUrl,
					botId: credentials.botId,
					event: eventType,
					slug: 'n8n',
					category: 'n8n',
					platform: credentials.platform,
					subscribe: true,
				};

				this.logger.info(`E1TestTrigger: Subscribe payload: ${JSON.stringify(body)}`);

				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/integrations/custom-app/subscribe-trigger-event`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authType: 'Key',
							Authorization: `Bearer ${credentials.accessToken}`,
						},
						json: true,
					});
					this.logger.info(`E1TestTrigger: Subscribe API success. Response: ${JSON.stringify(response)}`);
				} catch (error) {
					this.logger.error(`E1TestTrigger: Subscribe API failed. Error: ${error}`);
					throw new NodeOperationError(this.getNode(), 'Failed to subscribe to BotPenguin webhook');
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
				this.logger.info(`E1TestTrigger: Unsubscribing to BotPenguin webhook. Event: ${eventType}, Webhook URL: ${webhookUrl}`);

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/integrations/custom-app/subscribe-trigger-event`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authType: 'Key',
							Authorization: `Bearer ${credentials.accessToken}`,
						},
						json: true,
					});
				} catch {
					// Silent
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		this.logger.info(`E1TestTrigger: Webhook received. Body: ${JSON.stringify(this.getBodyData())}`);
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

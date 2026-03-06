import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperFields,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from './constant';

interface ContactPhone {
	number?: string;
	prefix?: string;
}

interface ContactDetails {
	email?: string;
	phone?: ContactPhone;
}

interface ContactPayload {
	profile: {
		userDetails: {
			userProvidedName: string;
			contact?: ContactDetails;
			tags?: string[];
			attributes?: unknown[];
		};
	};
}

export class E1Test implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E1 Test',
		name: 'e1Test',
		icon: 'file:botpenguin.svg',
		group: ['transform'],
		version: 1,
		description: 'Create contacts in BotPenguin (E1 test).',
		defaults: {
			name: 'E1 Test',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'botPenguinApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Add a Contact',
						value: 'createContact',
						action: 'Add a contact',
						description: 'Create a contact in BotPenguin.',
					},
					{
						name: 'Update Contact Attributes',
						value: 'updateAttributes',
						action: 'Update contact attributes',
						description: 'Update a contact attribute in BotPenguin.',
					},
					{
						name: 'Send Session Message',
						value: 'sendSessionMessage',
						action: 'Send a session message',
						description: 'Send a session message.',
					},
					{
						name: 'Send Template Message',
						value: 'sendTemplateMessage',
						action: 'Send a template message',
						description: 'Send a WhatsApp template message.',
					},
				],
				default: 'createContact',
			},
			{
				displayName: 'Phone Prefix',
				name: 'phonePrefix',
				type: 'string',
				default: '91',
				placeholder: '91',
				description: 'Country calling code (prefix).',
				required: true,
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				placeholder: '9876543210',
				description: 'Phone number without country code.',
				required: true,
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
			},
			{
				displayName: 'Name',
				name: 'userProvidedName',
				type: 'string',
				default: '',
				placeholder: 'Jane Doe',
				required: true,
				description: 'Full name of the contact.',
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'jane@example.com',
				description: 'Email address of the contact.',
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				placeholder: 'email / WhatsApp number with country code / UUID',
				description:
					'Please provide any one of the email, WhatsApp number, or UUID to update the user contact custom attribute. WhatsApp numbers should include the country code; only numeric values are allowed.',
				required: true,
				displayOptions: {
					show: {
						operation: ['updateAttributes'],
					},
				},
			},
			{
				displayName: 'Attribute Key',
				name: 'attributeKey',
				type: 'string',
				default: '',
				placeholder: 'attribute key',
				description: 'Enter the key of the attribute that needs to be updated here.',
				required: true,
				displayOptions: {
					show: {
						operation: ['updateAttributes'],
					},
				},
			},
			{
				displayName: 'Value',
				name: 'attributeValue',
				type: 'string',
				default: '',
				placeholder: 'new value',
				description: 'Enter the value to be updated here.',
				required: true,
				displayOptions: {
					show: {
						operation: ['updateAttributes'],
					},
				},
			},
			{
				displayName: 'Search',
				name: 'searchMessage',
				type: 'string',
				default: '',
				placeholder: 'email / WhatsApp number with country code / UUID',
				description:
					'Please provide any one of the email, WhatsApp number, or UUID to send a message. WhatsApp numbers should include the country code; only numeric values are allowed.',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendSessionMessage'],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'messageText',
				type: 'string',
				default: '',
				placeholder: 'Hello!',
				description: 'Enter the message text to be sent.',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendSessionMessage'],
					},
				},
			},
			{
				displayName: 'Select WhatsApp Bot',
				name: 'whatsAppBot',
				type: 'options',
				default: '',
				description: 'Select the WhatsApp bot to send messages.',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWhatsAppBots',
				},
				displayOptions: {
					show: {
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Select WhatsApp Template',
				name: 'whatsAppTemplate',
				type: 'options',
				default: '',
				description: 'Select your WhatsApp message template.',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWhatsAppTemplates',
					loadOptionsDependsOn: ['whatsAppBot'],
				},
				displayOptions: {
					show: {
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'WhatsApp Number',
				name: 'whatsAppNumber',
				type: 'string',
				default: '',
				placeholder: '91988101XXXX',
				description: 'Enter the recipient\'s mobile number with the country code & without plus sign. (e.g. 91988101XXXX)',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Template Variables',
				name: 'templateVariables',
				type: 'resourceMapper',
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				noDataExpression: true,
				typeOptions: {
					loadOptionsDependsOn: ['whatsAppTemplate'],
					resourceMapper: {
						resourceMapperMethod: 'getTemplateDynamicFields',
						mode: 'add',
						fieldWords: {
							singular: 'variable',
							plural: 'variables',
						},
						addAllFields: true,
						supportAutoMap: false,
						multiKeyMatch: false,
						noFieldsError: 'Select a WhatsApp template above to load its variables.',
					},
				},
				displayOptions: {
					show: {
						operation: ['sendTemplateMessage'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			getWhatsAppBots,
			getWhatsAppTemplates,
		},
		resourceMapping: {
			getTemplateDynamicFields,
		  },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const credentials = await this.getCredentials('botPenguinApi');
				const botId = (credentials?.botId as string) || '';
				const accessToken = (credentials?.accessToken as string) || '';
				const platform =
					typeof credentials?.platform === 'string'
						? (credentials.platform as string).toLowerCase()
						: undefined;

				if (operation === 'createContact') {
					const userProvidedName = this.getNodeParameter('userProvidedName', itemIndex) as string;
					const email = this.getNodeParameter('email', itemIndex, '') as string;
					const phoneNumber = this.getNodeParameter('phoneNumber', itemIndex, '') as string;
					const phonePrefix = this.getNodeParameter('phonePrefix', itemIndex, '') as string;

					const contact: ContactDetails = {};
					if (email) {
						contact.email = email;
					}
					if (phoneNumber) {
						contact.phone = {
							number: phoneNumber,
							prefix: phonePrefix || undefined,
						};
					}

					const payload: ContactPayload = {
						profile: {
							userDetails: {
								userProvidedName,
								contact: Object.keys(contact).length ? contact : undefined,
							},
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/inbox/users/import`,
						body: [payload],
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authtype: 'Key',
							botId,
						},
						qs: {
							botId,
						},
						json: true,
					});

					const responseItems = Array.isArray(response) ? response : [response];
					for (const entry of responseItems) {
						returnData.push({ json: entry as IDataObject });
					}
				} else if (operation === 'updateAttributes') {
					const search = this.getNodeParameter('search', itemIndex) as string;
					const attributeKey = this.getNodeParameter('attributeKey', itemIndex) as string;
					const attributeValue = this.getNodeParameter('attributeValue', itemIndex) as string;

					const body = {
						search,
						attributes: {
							[attributeKey]: attributeValue,
						},
						botId,
						platform,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'PUT',
						url: `${BASE_URL}/integrations/custom-app/update-user-attributes`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authtype: 'Key',
							Authorization: `Bearer ${accessToken}`,
						},
						json: true,
					});

					const responseItems = Array.isArray(response) ? response : [response];
					for (const entry of responseItems) {
						returnData.push({ json: entry as IDataObject });
					}
				} else if (operation === 'sendSessionMessage') {
					const search = this.getNodeParameter('searchMessage', itemIndex) as string;
					const messageText = this.getNodeParameter('messageText', itemIndex) as string;

					const body = {
						text: messageText,
						search,
						channel: platform
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/integrations/custom-app/send-message-to-plugin`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authtype: 'Key',
							Authorization: `Bearer ${accessToken}`,
							botId,
						},
						json: true,
					});

					const responseItems = Array.isArray(response) ? response : [response];
					for (const entry of responseItems) {
						returnData.push({ json: entry as IDataObject });
					}
				} else if (operation === 'sendTemplateMessage') {
					const whatsAppBot = this.getNodeParameter('whatsAppBot', itemIndex) as string;
					const whatsAppTemplate = this.getNodeParameter('whatsAppTemplate', itemIndex) as string;
					const whatsAppNumber = this.getNodeParameter('whatsAppNumber', itemIndex) as string;

					const variables = this.getNodeParameter('templateVariables', itemIndex, {}) as IDataObject;
					const templateParams = (variables.value as IDataObject) || {};

					const body = {
						botId: whatsAppBot,
						templateId: whatsAppTemplate,
						whatsAppNumber,
						templateParams,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
						method: 'POST',
						url: `${BASE_URL}/whatsapp-automation/plugin/send-template-message`,
						body,
						headers: {
							Accept: '*/*',
							'Content-Type': 'application/json',
							authtype: 'Key',
							Authorization: `Bearer ${accessToken}`,
						},
						json: true,
					});

					const responseItems = Array.isArray(response) ? response : [response];
					for (const entry of responseItems) {
						returnData.push({ json: entry as IDataObject });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}

		return [returnData];
	}
}

async function getWhatsAppBots(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('botPenguinApi');
	const accessToken = (credentials?.accessToken as string) || '';

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
		method: 'GET',
		url: `${BASE_URL}/whatsapp-automation`,
		headers: {
			Accept: '*/*',
			authtype: 'Key',
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const data = response.data || [];
	return data.map((bot: IDataObject) => ({
		name: (bot.name as string) || '',
		value: (bot._id as string) || '',
	}));
}

async function getWhatsAppTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const botId = this.getCurrentNodeParameter('whatsAppBot') as string;
	if (!botId) {
		return [];
	}

	const credentials = await this.getCredentials('botPenguinApi');
	const accessToken = (credentials?.accessToken as string) || '';

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
		method: 'GET',
		url: `${BASE_URL}/whatsapp-automation/plugin/templates/${botId}`,
		headers: {
			Accept: '*/*',
			authtype: 'Key',
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const data = response.data || [];
	return data.map((template: IDataObject) => ({
		name: ((template.configuration as IDataObject)?.name as string) || '',
		value: (template._id as string) || '',
	}));
}

async function getTemplateDynamicFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const templateId = this.getCurrentNodeParameter('whatsAppTemplate') as string;
	if (!templateId) {
		return { fields: [] };
	}

	const credentials = await this.getCredentials('botPenguinApi');
	const accessToken = (credentials?.accessToken as string) || '';

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'botPenguinApi', {
		method: 'GET',
		url: `${BASE_URL}/whatsapp-automation/plugin/make-template-dynamic-fields/${templateId}`,
		headers: {
			Accept: '*/*',
			authtype: 'Key',
			Authorization: `Bearer ${accessToken}`,
		},
	});

	return {
		fields: (response.data || []).map((field: IDataObject): ResourceMapperField => ({
			id: field.key as string,
			displayName: (field.value as string) || (field.key as string),
			defaultMatch: false,
			required: false,
			display: true,
			type: 'string',
		})),
	};
}


import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';
import { BASE_URL } from '../nodes/E1Test/constant';

export class BotPenguinApi implements ICredentialType {
	name = 'botPenguinApi';
	displayName = 'BotPenguin API';
	documentationUrl = 'https://botpenguin.com';
	icon: Icon = 'file:botpenguin.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'accessToken',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			description: 'API access token',
			required: true,
		},
		{
			displayName: 'Bot ID',
			name: 'botId',
			type: 'string',
			default: '',
			description: 'Bot identifier',
			required: true,
		},
		{
			displayName: 'Platform',
			name: 'platform',
			type: 'options',
			default: 'whatsapp',
			description: 'Platform associated with the bot',
			options: [
				{ name: 'WhatsApp', value: 'whatsapp' },
				{ name: 'Instagram', value: 'instagram' },
				{ name: 'Facebook', value: 'facebook' },
				{ name: 'Telegram', value: 'telegram' },
				{ name: 'Website', value: 'website' },
				{ name: 'SMS', value: 'sms' }
			],
			required: true,
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			qs: {
				access_token: '={{$credentials.accessToken}}',
				botId: '={{$credentials.botId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: BASE_URL,
			url: '/integrations/custom-app/general-authentication',
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				authtype: 'Key',
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
			body: {
				slug: 'n8n',
				botId: '={{$credentials.botId}}',
				platform: '={{$credentials.platform}}',
			},
			json: true,
		},
	};

}


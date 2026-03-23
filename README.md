# n8n-nodes-botpenguin

This is an n8n community node for BotPenguin. It lets you manage BotPenguin contacts, send messages, and trigger workflows from BotPenguin events inside n8n.


[Installation](#installation)  
[Operations](#operations)  
[Triggers](#triggers)  
[Credentials](#credentials)  
[Usage Notes](#usage-notes)  
[Development](#development)  
[Resources](#resources)

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

Package name:

```bash
npm install n8n-nodes-botpenguin
```

You can also install it from the n8n UI through `Settings -> Community Nodes`.

## Operations

The `BotPenguin` node currently supports these actions:

- `Add a Contact`
- `Update Contact Attributes`
- `Send Session Message`
- `Send Template Message`

## Triggers

The `BotPenguin Trigger` node currently supports:

- `New Contact Created`
- `Incoming Message`
- `WhatsApp Order Created`

The trigger subscribes to BotPenguin webhook events and emits normalized n8n output with:

- `event`
- `app`
- `botId`
- `platform`
- event-specific payload data
- `timestamp`


## Credentials

The `BotPenguin API` credential requires:

- `API Key`
- `Bot ID`
- `Platform`

Supported platform options in the credential:

- `WhatsApp`
- `Instagram`
- `Facebook`
- `Telegram`
- `Website`
- `SMS`

## Usage Notes

- `Send Template Message` is WhatsApp-only.
- `Send Session Message` uses the `Platform` selected in the credentials.
- For trigger nodes, your n8n instance must be reachable by BotPenguin so webhook registration can work correctly.
- For phone-based searches, use the full number with country code where the field description asks for it.

## Development

Available scripts:

```bash
npm run dev
npm run build
npm run lint
npm run lint:fix
npm run release
```


## Resources

- [BotPenguin](https://botpenguin.com)
- [BotPenguin Help Center](https://help.botpenguin.com)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](./LICENSE.md)

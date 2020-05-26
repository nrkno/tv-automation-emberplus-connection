# Ember+ Connection

A TyepScript implementation of [Lawo's Ember+](https://github.com/Lawo/ember-plus) control protocol for Node.

It has been tested with Lawo Ruby, Lawo R3lay and Lawo MxGUI.

The current version is very losely based on the original library and Mr Gilles Dufour's rewrites. It is however rewritten
almost completely from scratch and bears little to no resemblance to earlier libraries. This version only has a consumer
implementation.

## Example usage

### Client

Get Full tree:

```javascript
const { EmberClient } = require('emberplus-connection');
const client = new EmberClient("10.9.8.7", 9000);
client.on("error", e => {
   console.log(e);
});
await client.connect()
// Get Root info
const req = await client.getDirectory(client.tree)
await req.response
// Get a Specific Node
const node = await client.getElementByPath("0.0.2")
console.log(node);
// Get a node by its path identifiers
const node2 = await client.getElementByPath("path.to.node"))
console.log(node2);
// Get a node by its path descriptions
const node3 = await client.getElementByPath("descr1.descr2.descr3"))
console.log(node3);
// Expand entire tree under node 0
await client.expand(client.tree)
console.log(client.tree)
```

Subsribe to changes

```javascript
const { EmberClient, EmberLib } = require('emberplus-connection')

const client = new EmberClient(HOST, PORT)
client
	.connect()
	.then(async () => (await client.getDirectory(client.tree)).response)
	.then(() => {
		console.log(client.tree, null, 4)
	})
	.then(() => client.getElementByPath('scoreMaster/router/labels/group 1'))
	.then((node) => {
		// For streams, use subscribe
		return client.subscribe(node, (update) => {
			console.log(udpate)
		})
	})
	.then(() => client.getElementByPath('0.2'))
	.then(async (node) => {
		// For non-streams a getDirectory will automatically subscribe for update
		return (
			await client.getDirectory(node, (update) => {
				console.log(udpate)
			})
		).response
	})
	// You can also provide a callback to the getElementByPath
	// Be carefull that subscription will be done for all elements in the path
	.then(() =>
		client.getElementByPath('0.3', (update) => {
			console.log(update)
		})
	)
```

### Setting new value

```javascript
client = new EmberClient(LOCALHOST, PORT)
await client.connect()
await (await client.getDirectory()).response
const req = await client.setValue(await client.getElementByPath('0.0.1'), 'gdnet')
await req.response
console.log('result', req.response)
return client.disconnect().then(() => {
	console.log('disconnected')
})
```

### Invoking Function

```javascript
const { EmberClient, EmberLib } = require('node-emberplus')

const client = new EmberClient(HOST, PORT)
await client.connect()
await (await client.getDirectory()).response
const fn = await client.getElementByPath('path.to.function')
const req = await client.invoke(fn, 1, 2, 3)
console.log('result', await req.response)
```

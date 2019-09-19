# easy-websocket-server

An easy-to-use wrapper around the ws api for an express-like feel.

```sh
npm i easy-websocket-server
```

## Examples

```js
const app = require('express')();
const server = require('http').createServer(app);
const easySocket = require('easy-websocket-server');

const { send, broadcastAll } = easySocket.commands;
const socket = easySocket(server);

// Listen for connections
socket.onConnection(id => console.log(`${id} just connected!`))

// Listen for someMethod messages
socket.onMessage(`someMethod`, (id, message) => {
    console.log(`${id} sent a message:`, message);
});

// Listen for otherMethod messages
socket.onMessage(`otherMethod`, (id, message) => {
    console.log(`${id} sent a message:`, message);
})

// Send a message to a particular client
send(`someId`, `someMethod`, { ok: true });

// Broadcast to all the clients
broadcastAll(`someMethod`, { ok: true });

server.listen(3000);
```

Using without express is exactly the same, except you just call:

```js
const server = require('http').createServer();
```

Instead of this:

```js
const server = require('http').createServer(app);
```

### Remotes

Using the built in remoteEngine (similar to using `express.Router()`);

```js
// index.js
const app = require('express')();
const server = require('http').createServer(app);
const socket = require('easy-websocket-server')(server);
const createUser = require('./remotes/create-user');

socket.useRemote(`createUser`, createUser);

server.listen(3000);
```

```js
// ./remotes/create-user.js
const remote = require('easy-websocket-server').remoteEngine();

remote.onMessage(id => {
    // ...
    console.log(`User created!`);
})

module.exports = remote;
```

## Sending messages from the client

All must messages from the client are recomended to have this format:

```json
{
	"method": "someMethod",
	"data": "Whatever you wish to send.  Can be a string, object, or array."
}
```

If a client sends up a message without a `method` property, you can assign to the message a `default` method.

```js
socket.use((id, message, next) => {
    if (!message.method) message.method = `default`;
    next();
})
```

Then you can handle the message like this:

```js
socket.onMessage(`default`, (id, message) => {
    // Do something...
})
```

## API

```js
const easySocket = require('easy-socket-server');
```

- [`easySocket`](#easysocketserver)
    - [`onServerUpgrade`]()
    - [`onConnection`]()
    - [`use`]()
    - [`onMessage`]()
    - [`onClose`]()
    - [`useRemote`]()
    - [`catchErrors`]()
- [`easySocket.commands`]()
    - [`send`]()
    - [`broadcastAll`]()
    - [`broadcastExclude`]()
    - [`close`]()
    - [`getConnections`]()
- [`easySocket.remoteEngine`]()
    - [`onMessage`]()
- [`easySocket.hasConnected`]()

### easySocket(server)

```js
const socket = easySocket(server);
```

The `server` should be a http/https server instance.

#### socket.onServerUpgrade(callback: (next, quit, request, socket, head) => void)

The `callback` is called every time when the server upgrades a http(s) request to a websocket.

To keep the request from executing further, call `quit()`, otherwise you can call `next()`.

Example:

```js
socket.onServerUpgrade((next, quit, request, socket, head) => {
    if (someCondition) next();
    else quit();
})
```

#### socket.onConnection(callback: id => void)

The `callback` is called everytime a new websocket connection is recieved.  If `quit` or `next` are not called in [`socket.onServerUpgrade`](), then this will happen right after `onServerUpgrade`.

The `id` is the random id assigned to the client.

#### socket.use(callback: (id, message, next) => void)

Custom middleware, just like `express.use()`

#### socket.onMessage(method: String, callback: (id, message) => void)

The `callback` is called everytime a message is recieved whose method property equals `method`.

#### socket.onClose(callback: (id, code) => void)

The `callback` is called whenever a websocket connection closes. `id` will be the id of the connection that closed.

#### socket.useRemote(method: String, remote: [remoteEngine]())

The `remote` is the remoteEngine to use for the given `method`.

Now easySocket will call the `onMessage` method on the remote when the message's method property equals `method`.

Here is an [example]().

#### socket.catchErrors(callback: (error, id, message) => void)

The `callback` is called every time an unhandled error or promise rejection occurs in the message processing pipeline.  `message` and `id` are the message that was being processed when the error occured, and the id of the client that sent that message.

### easySocket.commands

```js
const { commands } = easySocket;
```

#### commands.send(id, method, data)

The `id` is the id of the client to send the message to.

The `method` is the method of the message.

The `data` is what is to me sent in the message.

#### commands.broadcastAll(method, data)

Same as [`commands.send`](), except that it broadcasts a message to all the clients.

#### commands.broadcastExclude()]

The `id` is the id of the client to exclude.

Otherwise, id is the same as [`commands.broadcastAll`]().

#### commands.close(id?)

If and `id` is given, easySocket will close only that connection, otherwise, it will close all the connections.

#### commands.getConnections(): Object

Returns an object of all the connections.  Here is an sample of what that might look like:

```json
{
    "socketId1568846090925": {
        "id": "socketId1568846090925",
        "incommingMessages": [
            {
                "method": "default",
                "data": "this is fake"
            }
        ],
        "outgoingMessages": [
            {
                "method": "someMethod",
                "data": "so is this"
            }
        ],
        "ip": "::1"
    }
}
```

### easySocket.remoteEngine()

```js
const remote = require('easy-websocket-server').remoteEngine();

// Do something...

module.exports = remote;
```

See this [example]().

#### remote.onMessage(callback: (id, message) => void)

The `callback` will be called when a message is recieved with a method that matches the `method` paramater in the `socket.useRemote` function.

### easySocket.hasConnected(id?): Boolean

The `id` is the id of the connection to check.  If no id is given, easySocket will check for at least one connection.

## Thanks

Many thanks to [@websockets/ws](https://github.com/websockets/ws), the backbone of this package.

## License

[MIT](/LICENSE)

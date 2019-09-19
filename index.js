const WebSocket = require('ws');
const validate = require('./validate');

let connections = {};

/**
 * @param {Server} server The http server to connect to
 */
module.exports = (server) => {
	// Start the server
	let sockets = null;

	sockets = new WebSocket.Server({ noServer: true });

	let callOnUpgrade = null;
	server.on('upgrade', async function upgrade(request, socket, head) {

		const next = () => {
			sockets.handleUpgrade(request, socket, head, (ws) => {
					sockets.emit('connection', ws, request);
			});
		}

		const quit = () => {
			socket.destroy();
		}
		
		if (callOnUpgrade) callOnUpgrade(next, quit, request, socket, head);
	});
	
	let callOnConnection = [];
	let callOnMessage = [];
	let callOnClose = [];
	let errorHandler = null;
	sockets.on('connection', function(socket, req) {
		const id = `socketId${Date.now()}`;

		socket.id = id;
		socket.incommingMessages = [];
		socket.outgoingMessages = [];
		socket.ip = req.connection.remoteAddress

		connections[id] = socket;

		callOnConnection.forEach(fn => fn(socket.id));

		socket.on(`message`, message => {
			message = JSON.parse(message);

			socket.incommingMessages.push(message);

			let index = -1;

			function call() {
				const fn = callOnMessage[index];
				if (fn) {
					if (errorHandler) {
						try {
							fn(socket.id, message, next);
						} catch (error) {
							errorHandler(error, socket.id, message);
						}
					} else fn(socket.id, message, next);
				}
			}

			function next() {
				index++;
				call();
			}

			next();
		})

		socket.on(`close`, code => {
			delete connections[id];
			callOnClose.forEach(fn => fn(id, code))
		})
	})

	/**
	 * @param {Function} cb Custom middleware
	 * @example
	 * socket.use((id, message, next) => {
	 *     // ...
	 * })
	 */
	function use(cb) {
		validate.cb(cb);

		callOnMessage.push(cb);
	}

	/**
	 * @param {Function} cb Called when the server upgrades a request to websocket
	 * @example
	 * socket.onServerUpgrade((next, quit, request, socket, head) => {
	 *     if (someCondition) next();
	 *     else quit();
	 * })
	 */
	function onServerUpgrade(cb) {
		validate.cb(cb);

		callOnUpgrade = cb;
	}

	/**
	 * @param {Function} cb Called everytime a new connection is recieved
	 */
	function onConnection(cb) {
		validate.cb(cb);

		callOnConnection.push(cb);
	}

	/**
	 * @param {String} method The method of message
	 * @param {Function} cb Called everytime a message is received with the correct method.
	 */
	function onMessage(method, cb) {
		validate.method(method);
		validate.cb(cb);

		callOnMessage.push((id, message, next) => {
			if (message.method == method) cb(id, message.data);
			else next();
		})
	}

	/**
	 * @param {Function} cb Called when a socket closes
	 */
	function onClose(cb) {
		validate.cb(cb);

		callOnClose.push(cb);
	}

	/**
	 * @param {String} method The method this remote is calling
	 * @param {Remote} remote
	 */
	function useRemote(method, remote) {
		validate.method(method);
		validate.remote(remote);

		remote.calls.forEach(call => {
			if (call.name === `onMessage`) call.params.unshift(method);

			this[call.name](...call.params);
		})
	}

	/**
	 * Catches all errors in the message processing pipeline
	 * @param {Function} cb Error handler
	 * @example
	 * socket.catchErrors((error, id, message) => {
	 *     console.error('Something went wrong.', error);
	 *     commands.broadcastAll('error', 'Internal server error');
	 *     commands.close();
	 * })
	 */
	function catchErrors(cb) {
		validate.cb(cb);

		errorHandler = cb;
	}

	return {
		use,
		onServerUpgrade,
		useRemote,
		onConnection,
		onMessage,
		onClose,
		catchErrors,
	}
}

/**
 * @param {String} id The id of the connection to send to
 * @param {String} method The method of message to send to the client
 * @param {(Object|String|Array)} data What to send to the client
 */
function send(id, method, data) {
	validate.id(id);
	validate.method(method);
	validate.messageData(data);
	thowErrorIfNoConnection();

	const newMessage = {
		method,
		data,
	}
	connections[id].send(JSON.stringify(newMessage));
	connections[id].outgoingMessages.push(newMessage);
}

/**
 * @param {String} method The method of message to send
 * @param {(Object|String|Array)} data What to send
 */
function broadcastAll(method, data) {
	validate.method(method);
	validate.messageData(data);
	thowErrorIfNoConnection();

	Object.keys(connections).forEach(id => send(id, method, data));
}

/**
 * @param {String} id The id of the connection to exclude
 * @param {String} method The method of message to send
 * @param {(Object|String|Array)} data What to send
 */
function broadcastExclude(id, method, data) {
	validate.id(id);
	validate.method(method);
	validate.messageData(data);
	thowErrorIfNoConnection();

	Object.keys(connections).forEach(keyId => {
		if (keyId !== id) send(keyId, method, data);
	})
}

/**
 * @param {String?} id The id of the connection to close.  If omitted, all connections will be closed.
 * @returns {Promise<boolean>}
 * @example
 * (async function() {
 *     await socket.close(`1234h1243y123`)
 * })
 * @example
 * (async function() {
 *     await socket.close()
 * })
 */
function close(id) {
	if (id !== undefined) validate.id(id);
	thowErrorIfNoConnection(id);

	return new Promise((resolve, reject) => {
		if (!id) connections.forEach(connection => connection.close());
		else if (!connections[id]) reject(new Error("Invalid id"));
		else {
			connections[id].close(() => {
				resolve(true);
			})
		}
	})
}

/**
 * @returns {Object}
 */
function getConnections() {
	let toReturn = {};

	Object.values(connections).forEach(connection => {
		const { id, incommingMessages, outgoingMessages, ip } = connection;
		toReturn[id] = { id, incommingMessages, outgoingMessages, ip };
	})

	return toReturn;
}

module.exports.commands = {
	send,
	broadcastAll,
	broadcastExclude,
	close,
	getConnections,
}

module.exports.remoteEngine = () => {
	let calls = []

	/**
	 * @param {Function} cb Called whenever a message is recieved with the method in the remote
	 * @example
	 * remote.onMessage((id, message) => {
	 *     console.log(`${message} was received from client ${id}`);
	 * })
	 */
	function onMessage(cb) {
		validate.cb(cb);

		calls.push({ name: 'onMessage', params: [cb] });
		return { calls };
	};

	return {
		calls,
		onMessage,
	}
}

/**
 * @param {String?} id The id of the connection to check.  If no id is given, easySocket will check for at least one connection.
 * @returns {Boolean}
 */
function hasConnected(id) {
	if (id !== undefined) {
		validate.id(id);

		return !!connections[id];
	} else return !!Object.keys(connections)[0];
}

/**
 * @param {String?} id The id of the connection to check.  If no id is given, easySocket will check for at least one connection.
 * @summary Throws an error if connection does not exist.
 */
function thowErrorIfNoConnection(id) {
	console.log(id)
	if (!hasConnected(id)) {
		console.log(id)
		if (!id) throw new Error(`There are no connections.`);
		else throw new Error(`There is no connection to a client with id "${id}".`);
	}
}

module.exports.socketHasConnected = hasConnected;

const easySocket = require('../');
const http = require('http');
const { broadcastExclude, broadcastAll, send, getConnections, close } = require('../').commands;
const { hasConnected: socketHasConnected } = require('../');
const dataRoutes = require('./data');

const server = http.createServer();
const socket = easySocket(server);

socket.onServerUpgrade((next, quit, req) => {
	console.log('Upgrading...');
	next();
})

socket.use((id, message, next) => {
	if (!message.method) message.method = 'data';
	next();
})

socket.use((id, message, next) => {
	console.log(`In middleware 2...`);
	next();
})

socket.onConnection(id => {
	console.log(`Connection: ${id}`);
	broadcastAll('new', 'hi');

	console.log(socketHasConnected());
	console.log(socketHasConnected(id));
})

socket.onMessage(`default`, (id, message) => {
	console.log(`New message from: ${id}`, message);
	send(id, "res", 'Thanks!');
	broadcastExclude(id, 'res', 'Hi, everyone!');
	console.log(getConnections());

	throw new Error('Unknown error!')
})

socket.useRemote(`data`, dataRoutes);

socket.catchErrors(err => {
	console.log('Something went wrong:', err.message)
})

server.listen(3000);

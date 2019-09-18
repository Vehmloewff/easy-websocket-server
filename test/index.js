const easySocket = require('../');
const http = require('http');
const { broadcastExclude, broadcastAll, send, getConnections } = require('../').commands;
const dataRoutes = require('./data');

const server = http.createServer();
const socket = easySocket(server);

socket.onServerUpgrade((next, quit, req) => {
	console.log('Upgrading...');
	next();
})

socket.use((id, message, next) => {
	message.method = 'data';
	next();
})

socket.use((id, message, next) => {
	console.log(`In middleware 2...`);
	next();
})

socket.onConnection(id => {
	console.log(`Connection: ${id}`);
	broadcastAll('new', 'hi');
})
socket.onMessage(`default`, (id, message) => {
	console.log(`New message from: ${id}`, message);
	send(id, "res", 'Thanks!');
	broadcastExclude(id, 'res', 'Hi, everyone!');
	console.log(getConnections());
})
socket.useRemote(`data`, dataRoutes);

server.listen(3000);

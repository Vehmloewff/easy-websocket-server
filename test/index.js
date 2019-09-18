const easySocket = require('../');
const http = require('http');
const { broadcastExclude, broadcastAll, send, getConnections } = require('../').commands;
const dataRoutes = require('./data');

const server = http.createServer();
const app = easySocket(server);

app.use((next, quit, req) => {
	console.log()
	next();
})

app.onConnection(id => {
	console.log(`Connection: ${id}`);
	broadcastAll('new', 'hi');
})
app.onMessage(`default`, (id, message) => {
	console.log(`New message from: ${id}`, message);
	send(id, "res", 'Thanks!');
	broadcastExclude(id, 'res', 'Hi, everyone!');
	console.log(getConnections());
})
app.useRemote(`data`, dataRoutes);

server.listen(3000);

const { commands, remoteEngine } = require('../');

const remote = remoteEngine()

remote.onMessage((id, message) => {
	console.log('message on data: ', id, message);
	commands.send(id, 'message', 'goodbye');
})

module.exports = remote;

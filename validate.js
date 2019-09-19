// TODO: rewrite using @hapi/joi

module.exports.method = value => {
	const type = typeof value;
	if (type !== 'string') throw new TypeError(`method should be a string.  Recieved type ${type}.`);
	// TODO: value should not be empty
}
module.exports.id = value => {
	const type = typeof value;
	if (type !== 'string') throw new TypeError(`id should be a string.  Recieved type ${type}.`);
}
module.exports.cb = value => {
	const type = typeof value;
	if (type !== 'function') throw new TypeError(`callback should be a string.  Recieved type ${type}.`);
}
module.exports.remote = value => {
	// TODO: throw error if value is not a valid remote
}
module.exports.messageData = value => {
	// TODO: throw error if value is not a jsonable
}
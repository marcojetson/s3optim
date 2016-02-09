function Logger(settings) {
	this.levels = settings.levels || ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
	this.verbosity = settings.verbosity;
	this.exitOnError = settings.exitOnError;

	this.levels.forEach(function (level) {
		this[level] = function (message) {
			this.log(level, message);
		}.bind(this);
	}.bind(this));
}

Logger.prototype.log = function (level, message) {
	if (this.levels.indexOf(level) > this.verbosity) {
		return;
	}

	console.log(level + ': ' + message);

	if (level === 'error' && this.exitOnError === true) {
		process.exit(1);
	}
};

module.exports = Logger;

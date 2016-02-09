var app = require('commander');
var Runner = require('./runner');
var Logger = require('./logger');

function list(val) {
    return val.split(',');
}

app
    .version('0.1.0')
    .option('-b, --buckets <buckets>', 'comma separated list of buckets', list)
    .option('-m, --mime <types>', 'comma separated list of mime types', list, [
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/svg+xml'
    ])
    .option('-k, --header <header>', 'added header name', 's3optim')
    .option('-v, --verbose', 'verbosity level', function (v, a) { return a + 1; }, 0)
    .parse(process.argv);

new Runner(app, new Logger({verbosity: app.verbose || 0, exitOnError: true})).run();
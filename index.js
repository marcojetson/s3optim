var app = require('commander');
var Runner = require('./runner');

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
    .option('-h, --header <header>', 'added header name', 's3optim')
    .parse(process.argv);

new Runner({buckets: app.buckets, mime: app.mime}).run();
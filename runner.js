var AWS = require('aws-sdk');
var async = require('async');
var Imagemin = require('imagemin');

function Runner(settings) {
    this.client = new AWS.S3();
    this.settings = settings;
    this.buckets = [];
    this.objects = [];
    this.count = 0;
}

Runner.prototype.run = function () {
    async.series([
        this.fetchBuckets.bind(this),
        this.filterBuckets.bind(this),
        this.fetchObjects.bind(this),
        this.processObjects.bind(this),
        this.report.bind(this)
    ]);
};

Runner.prototype.fetchBuckets = function (done) {
    this.client.listBuckets(function(err, buckets) {
        if (err) { throw err; }
        this.buckets = buckets.Buckets;
        done();
    }.bind(this));
};

Runner.prototype.filterBuckets = function (done) {
    if (typeof this.settings.buckets !== 'undefined') {
        this.buckets = this.buckets.filter(function (bucket) {
            return this.settings.buckets.indexOf(bucket.Name) > -1;
        }.bind(this));
    }
    done();
};

Runner.prototype.fetchObjects = function (done) {
    async.map(
        this.buckets,
        function (bucket, callback) {
            this.client.listObjects({Bucket: bucket.Name}, function (err, objects) {
                if (err) {
                    console.error('Failed retrive bucket "' + bucket.Name + '" objects: ' + err);
                    return callback(null, []);
                }

                objects.Contents.map(function (object) { object.Bucket = bucket; });
                callback(null, objects.Contents);
            });
        }.bind(this),
        function (err, results) {
            this.objects = [].concat.apply([], results);
            done();
        }.bind(this)
    );
};

Runner.prototype.processObjects = function (done) {
    async.each(
        this.objects,
        this.processObject.bind(this),
        function (err) {
            done();
        }
    );
};

Runner.prototype.processObject = function (object, next) {
    var headers, content, optimized;

    async.series([
        function (done) {
            this.client.headObject({Bucket: object.Bucket.Name, Key: object.Key}, function (err, response) {
                if (err) {
                    console.error('Failed to retrieve object "' + object.Key + '" headers: ' + err);
                    return next();
                }

                if (response.Metadata && response.Metadata.s3optim) {
                    console.info('Skipping object "' + object.Key + '" because it is already optimized');
                    return next();
                }

                headers = response;
                done();
            });
        }.bind(this),
        function (done) {
            this.client.getObject({Bucket: object.Bucket.Name, Key: object.Key}, function (err, response) {
                if (err) {
                    console.error('Failed to retrieve object "' + object.Key + '" content: ' + err);
                    return next();
                }

                content = response;
                done();
            });
        }.bind(this),
        function (done) {
            new Imagemin()
                .src(content.Body)
                .run(function (err, files) {
                    if (err) {
                        console.error('Failed to optimize object "' + object.Key + '": ' + err);
                        return next();
                    }

                    optimized = files[0].contents;
                    done();
                });
        },
        function (done) {
            var metadata = {};
            metadata[this.settings.header] = '' + new Date().getTime();

            var request = {
                Bucket: object.Bucket.Name,
                Key: object.Key,
                Body: optimized,
                ContentType: content.ContentType,
                Metadata: metadata
            };

            this.client.upload(request, function (err, upload) {
                if (err) {
                    console.error('Failed to upload object "' + object.Key + '": ' + err);
                    return next();
                }

                done();
            }.bind(this));
        }.bind(this),
        function () {
            this.count += 1;
            next();
        }.bind(this)
    ]);
};

Runner.prototype.report = function (done) {
    console.log('Done! ' + this.count + ' files optimized');
    done();
}

module.exports = Runner;
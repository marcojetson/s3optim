var AWS = require('aws-sdk');
var async = require('async');
var Imagemin = require('imagemin');

function Runner(settings, logger) {
    this.client = new AWS.S3();
    this.logger = logger;
    this.settings = settings;
}

Runner.prototype.run = function () {
    async.waterfall([
        this.fetchBuckets.bind(this),
        this.fetchObjects.bind(this),
        this.processObjects.bind(this)
    ]);
};

Runner.prototype.fetchBuckets = function (callback) {
    this.logger.info('Retrieving buckets');
    this.client.listBuckets(function(err, response) {
        if (err) {
            this.logger.error('Failed to retrieve buckets');
        }

        if (typeof this.settings.buckets !== 'undefined') {
            response.Buckets = response.Buckets.filter(function (bucket) {
                return this.settings.buckets.indexOf(bucket.Name) > -1;
            }.bind(this));
        }

        callback(null, response.Buckets);
    }.bind(this));
};

Runner.prototype.fetchObjects = function (buckets, callback) {
    async.map(
        buckets,
        function (bucket, next) {
            this.logger.info('Fetching objects for bucket ' + bucket.Name);
            this.client.listObjects({Bucket: bucket.Name}, function (err, objects) {
                if (err) {
                    this.logger.warn('Failed to retrieve bucket "' + bucket.Name + '" objects: ' + err);
                    return next(null, []);
                }

                objects.Contents.map(function (object) { object.Bucket = bucket; });
                next(null, objects.Contents);
            });
        }.bind(this),
        function (err, results) {
            callback(null, [].concat.apply([], results));
        }
    );
};

Runner.prototype.processObjects = function (objects) {
    objects.forEach(this.processObject.bind(this));
};

Runner.prototype.processObject = function (object) {
    async.waterfall([
        function (callback) {
            callback(null, object);
        },
        this.filterObject.bind(this),
        this.getObjectContents.bind(this),
        this.optimizeObject.bind(this),
        this.replaceObject.bind(this)
    ]);
};

Runner.prototype.filterObject = function (object, callback) {
    this.client.headObject({Bucket: object.Bucket.Name, Key: object.Key}, function (err, response) {
        if (err) {
            this.logger.warn('Failed to retrieve object "' + object.Key + '" headers: ' + err);
            return;
        }

        if (this.settings.mime.indexOf(response.ContentType) === -1) {
            this.logger.warn('Skipping object "' + object.Key + '" because of its mime type: ' + response.ContentType);
            return;
        }

        if (response.Metadata && response.Metadata[this.settings.header]) {
            this.logger.warn('Skipping object "' + object.Key + '" because it is already optimized');
            return;
        }

        object.Headers = response;
        callback(null, object);
    }.bind(this));
};

Runner.prototype.getObjectContents = function (object, callback) {
    this.client.getObject({Bucket: object.Bucket.Name, Key: object.Key}, function (err, response) {
        if (err) {
            this.logger.warn('Failed to retrieve object "' + object.Key + '" content: ' + err);
            return;
        }

        object.Contents = response;
        callback(null, object);
    });
};

Runner.prototype.optimizeObject = function (object, callback) {
    new Imagemin()
        .src(object.Contents.Body)
        .run(function (err, files) {
            if (err) {
                this.logger.warn('Failed to optimize object "' + object.Key + '": ' + err);
                return;
            }

            object.OptimizedContents = files[0].contents;
            callback(null, object);
        });
};

Runner.prototype.replaceObject = function (object, callback) {
    object.Headers.Metadata[this.settings.header] = '' + new Date().getTime();

    var request = {
        Bucket: object.Bucket.Name,
        Key: object.Key,
        Body: object.OptimizedContents,
        ContentType: object.Headers.ContentType,
        Metadata: object.Headers.Metadata
    };

    this.client.upload(request, function (err, upload) {
        if (err) {
            this.logger.warn('Failed to upload object "' + object.Key + '": ' + err);
        }

        var optimizedPercent = Math.round(100 - (object.OptimizedContents.length * 100 / object.Contents.Body.length));
        this.logger.info('Object "' + object.Key + '" optimized by ' + optimizedPercent + '%');
    }.bind(this));
};

module.exports = Runner;
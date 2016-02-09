# s3optim

A command line tool that optimizes images stored in S3, inspired by [Autosmush](https://github.com/tylerhall/Autosmush).

## Installation

    npm install s3optim

## Usage

    s3optim [options]

### Options

    -h, --help               output usage information
    -V, --version            output the version number
    -b, --buckets <buckets>  comma separated list of buckets
    -m, --mime <types>       comma separated list of mime types
    -k, --header <header>    added header name
    -v, --verbose            verbosity level

## AWS credentials

This are the ways to load credentials in order of recommendation:

1. Loaded from IAM roles for Amazon EC2 (if running on EC2)
2. Loaded from the shared credentials file (~/.aws/credentials)
3. Loaded from environment variables

For more information refer to [Configuring the AWS SDK in Node.js](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html).

## License

BSD 3-Clause
'use strict';

// External dependencies
const errorlog = require('errorlog');
const level    = require('level');
const ms       = require('ms');
const path     = require('path');

// Internal dependencies
const Processor = require('./lib/processor');
const merge     = require('./lib/merge');

// Parse command line (easlily)
let configuration = {};

const argp = process.argv.indexOf(__filename);
if (argp < 0) throw new Error("Hmm... No command line?");

process.argv.slice(argp + 1).forEach((file) => {
  const config = require(path.resolve(file));
  configuration = merge(configuration, config);
});

// Our log
const log = errorlog({level: errorlog.ALL});

// Our feeds
const feeds = configuration.feeds || [];
delete configuration.feeds;

// Our database
const db = level(configuration.db || './db/');
delete configuration.db;

// Our refresh interval (default to 1 minute)
const interval = configuration.interval ? ms('' + configuration.interval) : 60000;
delete configuration.interval;

// Default cutoff time is "now" as an ISO string
configuration.cutoff = (configuration.cutoff ? new Date(configuration.cutoff) : new Date()).toISOString();

// Merge in our feeds and prepare processors...
if (feeds.length < 1) throw new Error('No feeds to fetch');
const processors = [];
feeds.forEach((feed) => {
  const merged = merge(configuration, feed);
  processors.push(new Processor(merged, db, log));
});

/* ========================================================================== *
 * Run all our processors forever...                                          *
 * ========================================================================== */
processors.forEach((processor) => {

  // Our callback (endless loop)
  function callback(error) {
    if (error) log.error('Error processing feed %s', processor.uri, error);
    log.debug('Sleeping for approximately %s', ms(interval));
    setTimeout(() => processor.process(callback), interval);
  };

  // Start with this feed...
  processor.process(callback);

});

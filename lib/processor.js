'use strict';

const Slack     = require('node-slack');
const errorlog  = require('errorlog');
const request   = require('request');

const iterate   = require('./iterate.js');

module.exports = function Processor(feed, db, log) {
 // if (!(this instanceof Processor)) return new Processor(feed, db, log);

  // Must have a Feed and DB, log is defaulted
  if (! feed) throw new Error('No feed specified');
  if (! db) throw new Error('No DB specified');
  if (! log) log = errorlog({ level: errorlog.WARN });

  // Our 'it' (iterate) function
  const it = iterate((error, item, index) => {
    log.warn('Error iterating at index %d', index, item, error);
  });

  // Check parameters
  if (! feed.id) throw new Error('No ID in feed');
  if (! feed.delay) throw new Error('No message delay in feed');
  if (! feed.cutoff) throw new Error('No cutoff date in feed');
  if (! feed.jira_url) throw new Error('No Jira URL in feed');
  if (! feed.slack_url) throw new Error('No Slack URL in feed');

  // Local variables
  const slack = new Slack(feed.slack_url);
  const cutoff = feed.cutoff;
  const uri = feed.jira_url;
  const delay = feed.delay;

  // Authentication?
  const auth = {};
  if (feed.jira_user) auth.user = feed.jira_user;
  if (feed.jira_pass) auth.pass = feed.jira_pass;

  // Our query, defaulting to *ALL*
  const query = feed.jira_query || '';

  // Search for updates up to one day back
  let search = uri + '/rest/api/2/search';
  search += '?jql=' + encodeURIComponent((query ? query + ' AND ' : '') + 'updated >= -1d ORDER BY updated DESC');
  search += '&fields=' + encodeURIComponent('*navigable,comment,changelog');
  search += '&expand=' + encodeURIComponent('comment,changelog');
  Object.defineProperty(this, uri, { value : uri });

  /* ======================================================================== *
   * Called on each issue, processes creation and calls below                 *
   * ======================================================================== */
  function process_issue(issue, cb) {
    const dbKey = feed.id + ':created:' + issue.id;

    db.get(dbKey, (err, created) => {
      if (err && err.notFound) created = cutoff;
      else if (err) return cb(err);

      // Process issue histories and comments
      function process_contents() {
        process_histories(issue, (err) => {
          if (err) log.warn('Error processing history for ' + issue.key, err);
          process_comments(issue, (err) => {
            if (err) log.warn('Error processing comments for ' + issue.key, err);
            cb();
          });
        });
      }

      if (issue.fields.created > created) {
        // Notify issue creation then contents
        notify(issue, issue.fields.creator, 'created', (err) => {
          if (err) log.warn('Error notifying creation of ' + issue.key, err);
          db.put(dbKey, issue.fields.created, (err) => {
            if (err) return cb(err);
            process_contents();
          });
        });

      } else {
        // No need to notify creation, but still process the contents
        log.debug('Skipping creation of %s (%s < %s)', issue.key, issue.fields.created, created);
        process_contents();
      }
    });
  }

  /* ======================================================================== *
   * Process all the comments iterating through them                          *
   * ======================================================================== */
  function process_comments(issue, cb) {
    if (! issue.fields) return cb();
    if (! issue.fields.comment) return cb();
    if (! issue.fields.comment.comments) return cb();

    it(issue.fields.comment.comments, cb, (comment, cb2) => {
      process_comment(issue, comment, cb2)
    });
  }

  // Each comment
  function process_comment(issue, comment, cb) {
    const dbKey = feed.id + ':commented:' + comment.id;

    db.get(dbKey, (err, commented) => {
      if (err && err.notFound) commented = cutoff;
      else if (err) return cb(err);

      const author = comment.updateAuthor || comment.author;
      const date = comment.updated || comment.created;

      if (date > commented) {
        log.info('Issue comment %s#%s', issue.key, comment.id);
        notify(issue, author, 'commented on', (err) => {
          if (err) return cb(err);
          db.put(dbKey, date, cb);
        });
      } else {
        log.debug('Skipping comment %s#%s  (%s < %s)', issue.key, comment.id, date, commented);
        cb();
      }
    });

  }

  /* ======================================================================== *
   * Process all histories just notifying ONCE per author                     *
   * ======================================================================== */
  function process_histories(issue, cb) {
    if (! issue.changelog) return cb();
    if (! issue.changelog.histories) return cb();

    let authors = [];

    function send(err) {
      if (err) return cb(err);
      if (authors.length == 0) return cb();

      it(authors, cb, (author, cb3) => {
        notify(issue, author, 'updated', cb3);
      });
    }

    it(issue.changelog.histories, send, (history, cb2) => {
      process_history(issue, history, (err, author) => {
        if (err) return cb2(err);
        if (author == null) return cb2();

        for (let i = 0; i < authors.length; i ++) {
          if (authors[i].key == author.key) return cb2();
        }

        authors.push(author);
        cb2();
      });
    });
  }

  // Single history, callback with author or null
  function process_history(issue, history, cb) {
    const dbKey = feed.id + ':history:' + history.id;

    db.get(dbKey, (err, created) => {
      if (err && err.notFound) created = cutoff;
      else if (err) return cb(err);

      if (history.created > created) {
        db.put(dbKey, history.created, (err) => {
          if (err) return cb(err);
          log.info('Issue history %s#%s', issue.key, history.id);
          cb(null, history.author);
        });
      } else {
        log.debug('Skipping history %s#%s (%s < %s)', issue.key, history.id, history.created, created);
        cb();
      }
    });
  }

  /* ======================================================================== *
   * Nicely send a notification back to slack                                 *
   * ======================================================================== */
  function notify(issue, author, action, cb) {

    // Basics structure of a message
    let message = {};
    let attachment = {};
    let fields = [];

    if (feed.icon_url) message.icon_url = feed.icon_url;
    if (feed.channel) message.channel = feed.channel;
    message.attachments = [ attachment ];
    attachment.fields = fields;

    // Figure out the display name and uri for the issue
    let displayName = author.displayName || author.name || null;
    let href = uri + '/browse/' + issue.key;

    // Basic user name for the notfication and start injecting the text
    message.username = displayName ? displayName + ' (JIRA)' : 'JIRA';
    message.text = displayName ? displayName : 'Someone'

    // Wrap text with email if we can
    if (author.emailAddress) {
      message.text = '<mailto:' + author.emailAddress + '|' + message.text + '>';
    }

    // Add action and issue link in the text
    message.text = message.text + ' ' + action + ' <' + href + '|' + issue.key + '>';

    // Attachment title from the issue
    attachment.title = issue.summary;
    attachment.title_link = href;

    // Extra fields for the attachment
    fields.push({ title: 'Type', short: true,
      value: issue.fields.issuetype && issue.fields.issuetype.name ? issue.fields.issuetype.name : 'Unknown'
    });
    fields.push({ title: 'Status', short: true,
      value: issue.fields.status && issue.fields.status.name ? issue.fields.status.name : 'Unknown'
    })
    fields.push({ title: 'Resolution', short: true,
      value: issue.fields.resolution && issue.fields.resolution.name ? issue.fields.resolution.name : 'None'
    })
    if (issue.fields.assignee) {
      fields.push({ title: 'Assigned To', short: true,
        value: issue.fields.assignee.displayName || issue.fields.assignee.name || 'Unknown User'
      })
    } else {
      fields.push({ title: 'Assigned To', short: true, value: 'Unassigned'});
    }

    // Send down to slack...
    log.trace('Sending message to slack', message);
    if (feed.disabled) return cb();

    slack.send(message, (error) => {
      if (error) return(cb(error));
      setTimeout(cb, delay);
    });

  }

  /* ======================================================================== *
   * Actual processing exposed to users of this class                         *
   * ======================================================================== */
  function processBody(body, cb) {
    try {
      const json = JSON.parse(body);
      if (! json.issues) throw new Error('No issues in feed');
      it(json.issues, cb, process_issue);
    } catch (error) {
      cb(error);
    }
  }

  this.processBody = processBody;
  this.process = function process(cb) {
    log.debug('About to fetch %s', search);
    request.get(search, { 'auth': auth }, (error, response, body) => {
      if (error) return cb(error);
      if (response.statusCode != 200) return cb(new Error('Invalid status ' + response.statusCode));
      processBody(body, cb);
    });
  }
}

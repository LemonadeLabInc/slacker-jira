Better notifications from Jira to Slack
=======================================

[Slack](slack.com) integrates with [JIRA](https://www.atlassian.com/software/jira)
pretty nicely, but that said, I have noticed that from time to time (especially
with JIRA cloud) notifications are not forwarded.

This is a simple [Node.JS](https://nodejs.org/) _4.x_ integration that sucks
down data from JIRA using the REST API, and forwards events to Slack using the
Incoming WebHooks.

The state (in order to avoid repeated notifications) is kept in a local LevelDB
database on disk.

Install
-------

Git clone this:

```bash
git clone git@github.com:LemonadeLabInc/slacker-jira.git
```

Then modify the [`configuration.json`](configuration-sample.json) file according to
your needs, add a `credentials.json` file containing all your secrets and:

```bash
npm start
```

That's it.


Configuration
-------------

The command line read by [`index.js`](index.js) accepts any number of files.
Those must be valid JSON documents and will be merged up all together before
starting.

### Global configurations

Normally found in [`configuration.json`](configuration-sample.json):

* `database`: _(required)_ The local directory for the cache db.
* `feeds`: _(required)_ An array of feed configurations (see below).
* `interval`: The interval in [`ms`](https://www.npmjs.com/package/ms) format
  (or number of milliseconds) to wait before repeating the query to JIRA.

Normally found in `credentials.json`:

* `slack_url`: _(required)_ The endpoint if the Slack Incoming WebHook.
* `jira_url`: _(required)_ The URL of your JIRA install (before `/browse/`).
* `jira_user`: _(optional)_ The user name for JIRA.
* `jira_pass`: _(optional)_ The password for JIRA.

### Feed configurations

Basic feeds can be configured as follows:

* `id`: A unique identifier for this feed; feeds with same IDs will share the
  same notification cache in the local db.
* `query`: _(optional)_ The JQL Jira Query selecting the issues; defaults to
  all JIRA issues (the empty string).
* `cutoff`: _(optional)_ A date in ISO format before which any JIRA event
  will be ignored; defaults to the time `npm start` is called.
* `channel`:  _(optional)_ What channel to send messages to.
* `icon_url`: _(optional)_ The icon URL to attach to notifications.
* `delay`: _(optional)_ Delay between calls to Slack (be nice to them); defaults
  to 100 milliseconds, in [`ms`](https://www.npmjs.com/package/ms) format
  or number of milliseconds.

All these options can also be stored *outside* at the root of the JSON object,
and doing so will mean that they will be shared by all feeds, but can be
overridden in each field definition.


License (MIT)
-------------

Copyright &copy; 2015 Lemonade Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


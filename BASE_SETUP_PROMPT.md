Make a node version that shares most of its code with the chrome-extension. I created a new branch for this.
Rearrange the repo to have /src and build in /dist: /server /chrome-extension.

Make it compatible with orion on ios as well.

The server should have all the functionality of the PHP implementation whereby it:
  - provides a web page to enter data
  - uses a .env file with the same keys as the php version
  - takes incoming emails from postmark

Do not stop working until we are done.

Add tests and a script to run them.  Use standard unit testing library.

- Assume that the node process will be run via reverse proxy from nginx or apache.  Don't make this a hard requirement.
- Allow the node server to run via Docker.  Create test inputs for testing.

- In the server version use https://github.com/Joakim-animate90/curlBrowser for fetching URLs.  Deploy via docker along with docker-compose, using the example that it has there.  Don't launch on run, but let the node process do "docker run" to launch it.

Provide in README.md:
  - General layout and functionality
  - How to install chrome extension
  - How to install orion extension on ios (and on mac)
  - How to set up server

- Update CLAUDE.md as you go with appropraite rules, build instructions, etc.  Make sure it says to read README.md on each commit.

- For caching on the server, use a sqlite database

Use @/.claude/commands/multi-llm.md to make a plan.  Maintain a TASKS.md file to keep track of progress and update it as you go.

Clean up the repo removing outdated files.  For now, don't delete the php script, but move it into a /php folder. We will delete it later.

Make commits atomicaly as often as possible (@~/.claude/workflows/git-workflow.md)

Whenever compacting the conversation, ensure the new conversation reads CLAUDE.md as well as the systemwide CLAUDE.md and makes it absolutely clear that ALL INSTRUCTIONS IN THOSE FILES MUST EXPLICTLY BE FOLLOWED.


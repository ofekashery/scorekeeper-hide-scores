const prompts = require('prompts');
const nodeFetch = require('node-fetch');
const fetch = require('fetch-cookie/node-fetch')(nodeFetch);
const WebSocket = require('ws');
let host, event, overlay;
let matchTimer;

login().then(() => {
  console.log('\nConnected!');
  const ws = new WebSocket(`ws://${host}/apiv2/stream/?code=${event}`);
  ws.on('message', (data) => {
    data = JSON.parse(data);
    const type = data.updateType;
    if (type === 'MATCH_START') {
      console.log('Match start');
      matchTimer = setTimeout(() => {
        console.log('Match end');
        fetch(`http://${host}/event/${code}/control/command/${overlay ? 'video' : 'blank'}/`, {'method': 'POST'});
      }, 158 * 1000 + 500);
    } else if (type === 'MATCH_ABORT') {
      clearTimeout(matchTimer);
    }
  });
  ws.on('close', () => {
    console.error('\nScorekeeper disconnected.');
    process.exit();
  });
}).catch(e => {
  console.log();
  console.error(e.message);
  process.exit();
});

async function login() {
  host = (await prompts({
    type: 'text',
    name: 'host',
    initial: 'localhost',
    message: 'What is your Scorekeeper IP?'
  })).host;
  return fetch(`http://${host}/api/v1/events/`).then(res => res.json()).then(async (events) => {
    const names = {};
    for (const code of events.eventCodes) {
      names[code] = await fetch(`http://${host}/api/v1/events/${code}/`).then(res => res.json()).then(res => res.name);
    }
    const response = await prompts([
      {
        type: 'text',
        name: 'username',
        initial: 'local',
        message: 'What is your Scorekeeper username?'
      },
      {
        type: 'text',
        name: 'password',
        message: 'What is your Scorekeeper password?'
      },
      {
        type: 'select',
        name: 'event',
        message: 'Select your event',
        choices: Object.keys(names).map((code) => ({ title: names[code], description: code}))
      },
      {
        type: 'confirm',
        name: 'overlay',
        message: 'Do you use overlay?'
      }
    ]);
    event = events.eventCodes[response.event];
    overlay = response.overlay;
    return fetch(`http://${host}/callback/`, {
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'redirect': 'manual',
      'body': `username=${response.username}&password=${response.password}&submit=Login&client_name=FormClient`,
      'method': 'POST'
    }).then((res) => {
      if (res.headers.get('Location').includes('CredentialsException')) throw 'Incorrect username or password.';
    });
  }).catch((e) => {
    throw Error(typeof e === 'string' ? e : 'Cannot access the scorekeeper.');
  })
}

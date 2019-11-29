const readline = require('readline');
const nodeFetch = require('node-fetch');
const fetch = require('fetch-cookie')(nodeFetch);
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
        fetch(`http://${host}/event/test/control/command/${overlay ? 'video' : 'blank'}/`, {'method': 'POST'});
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
  host = await getInput('Enter the scorekeeper IP address:');
  event = await getInput('Enter the event code:');
  const user = await getInput('Enter username:');
  const pass = await getInput('Enter password:');
  const overlayInput = (await getInput('Do you use overlay? (yes/no)')).toLowerCase();
  overlay = overlayInput === 'y' || overlayInput === 'yes';
  return fetch(`http://${host}/callback/`, {
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'redirect': 'manual',
    'body': `username=${user}&password=${pass}&submit=Login&client_name=FormClient`,
    'method': 'POST'
  }).then((res) => {
    if (res.url.includes('CredentialsException')) throw Error('Incorrect username or password.');
  });
}

function getInput(title) {
  return new Promise((resolve, reject) => {
    process.stdout.write(title + ' ');
    const input = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    input.on('line', resolve);
  });
}

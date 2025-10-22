const express = require('express');
const Gpio = require('onoff').Gpio;
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// GPIO setup (adjust pin 26 to your relay pin)
const relay = new Gpio(26, 'out');

// Configuration
const PIALERT_API_URL = process.env.PIALERT_API_URL || 'http://localhost:8000/api/v1/alert-status';
const API_KEY = process.env.PIALERT_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '30000');

if (!API_KEY) {
  console.error('ERROR: PIALERT_API_KEY environment variable is required');
  process.exit(1);
}

// State tracking
let relayState = false;
let lastAlertData = null;
let lastPollTime = null;
let pollHistory = [];
const MAX_HISTORY = 50;

console.log(`Starting PiAlert Relay Controller`);
console.log(`API URL: ${PIALERT_API_URL}`);
console.log(`Poll Interval: ${POLL_INTERVAL}ms`);
console.log(`GPIO Pin: 26`);

// Poll the PiAlert monitoring app
setInterval(async () => {
  try {
    const response = await fetch(PIALERT_API_URL, {
      headers: {
        'x-api-key': API_KEY
      },
      timeout: 5000
    });

    const pollEntry = {
      timestamp: new Date().toISOString(),
      status: response.status,
      success: response.ok
    };

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 'unknown';
        console.warn(`⏱️  Rate limited. Retry after ${retryAfter}s`);
        pollEntry.error = `Rate limited (${retryAfter}s)`;
      } else if (response.status === 401) {
        console.error(`❌ Authentication failed (401). Check API key.`);
        pollEntry.error = 'Auth failed (invalid key)';
      } else {
        console.error(`⚠️  API error: ${response.status}`);
        pollEntry.error = `API error: ${response.status}`;
      }
      pollHistory.unshift(pollEntry);
      if (pollHistory.length > MAX_HISTORY) pollHistory.pop();
      return;
    }

    const data = await response.json();
    lastAlertData = data;
    lastPollTime = new Date();

    // Control relay based on alert state
    if (data.alert) {
      relay.writeSync(1);
      relayState = true;
      const targetNames = data.failing_targets
        .map(t => `${t.name} (${t.failures}/${t.threshold})`)
        .join(', ');
      console.log(`🔴 RELAY ON - ${data.failing_count} target(s) down: ${targetNames}`);
      pollEntry.relay_state = 'ON';
      pollEntry.alert = true;
    } else {
      relay.writeSync(0);
      relayState = false;
      console.log(`🟢 RELAY OFF - All systems operational`);
      pollEntry.relay_state = 'OFF';
      pollEntry.alert = false;
    }

    pollHistory.unshift(pollEntry);
    if (pollHistory.length > MAX_HISTORY) pollHistory.pop();

  } catch (error) {
    console.error(`⚠️  Polling error: ${error.message}`);
    relay.writeSync(0);
    relayState = false;
    pollHistory.unshift({
      timestamp: new Date().toISOString(),
      status: 'error',
      success: false,
      error: error.message
    });
    if (pollHistory.length > MAX_HISTORY) pollHistory.pop();
  }
}, POLL_INTERVAL);

// Serve static UI
app.use(express.json());
app.use(express.static('public'));

// API endpoints for the UI
app.get('/api/status', (req, res) => {
  res.json({
    relay_state: relayState,
    last_poll: lastPollTime,
    alert_data: lastAlertData,
    api_url: PIALERT_API_URL,
    poll_interval_ms: POLL_INTERVAL
  });
});

app.get('/api/history', (req, res) => {
  res.json(pollHistory);
});

app.post('/api/relay/toggle', (req, res) => {
  relay.writeSync(relayState ? 0 : 1);
  relayState = !relayState;
  console.log(`📌 Manual override: Relay ${relayState ? 'ON' : 'OFF'}`);
  res.json({ relay_state: relayState, manual_override: true });
});

app.post('/api/relay/on', (req, res) => {
  relay.writeSync(1);
  relayState = true;
  console.log(`📌 Manual override: Relay ON`);
  res.json({ relay_state: true, manual_override: true });
});

app.post('/api/relay/off', (req, res) => {
  relay.writeSync(0);
  relayState = false;
  console.log(`📌 Manual override: Relay OFF`);
  res.json({ relay_state: false, manual_override: true });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'relay controller running',
    api_url: PIALERT_API_URL,
    poll_interval_ms: POLL_INTERVAL,
    relay_state: relayState
  });
});

app.listen(5000, () => {
  console.log('✅ Relay controller started on port 5000');
  console.log(`📡 Open http://localhost:5000 to view the dashboard`);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  relay.unexportSync();
  process.exit();
});
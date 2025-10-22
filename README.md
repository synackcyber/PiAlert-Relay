# PiAlert Relay Controller

Docker-based GPIO relay controller for Raspberry Pi that polls PiAlert API and controls a relay based on alert status.

## Features

- 🔄 Configurable API polling interval
- 🔌 GPIO pin 26 relay control
- 🌐 Web dashboard for monitoring and manual control
- 📊 Poll history tracking
- 🐳 Docker container with GPIO access
- 🔴 Visual alerts and status indicators

## Hardware Requirements

- Raspberry Pi (tested on Pi 4/5)
- Relay module connected to GPIO pin 26
- PiAlert instance running with API enabled

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/synackcyber/PiAlert-Relay.git
cd PiAlert-Relay
```

### 2. Configure Environment Variables

Edit `docker-compose.yml` and update:

```yaml
environment:
  - PIALERT_API_URL=http://your-pialert-ip:8000/api/v1/alert-status
  - PIALERT_API_KEY=your-api-key-here
  - POLL_INTERVAL=30000  # Poll every 30 seconds
```

### 3. Build and Run

```bash
docker compose up -d --build
```

### 4. Access the Dashboard

Open your browser to:
```
http://<raspberry-pi-ip>:5000
```

## Configuration

### GPIO Pin

The default GPIO pin is **26** (BCM numbering). To change it, edit `app.js`:

```javascript
const relay = new Gpio(26, 'out');  // Change 26 to your pin number
```

### Relay Logic

- **Active HIGH** (default): GPIO HIGH = Relay ON
- **Active LOW**: Invert the logic in the code if needed

### API Polling

Adjust the polling interval via environment variable (in milliseconds):

```yaml
POLL_INTERVAL=60000  # Poll every 60 seconds
```

## Troubleshooting

### GPIO Permission Errors

If you see `EINVAL: invalid argument, write` errors:

1. Ensure your Pi has GPIO enabled
2. Check that `/dev/gpiochip0` exists
3. Verify the container has `privileged: true`

### Container Won't Start

Check logs:
```bash
docker compose logs -f relay-controller
```

### API Connection Issues

- Verify the PiAlert API URL is correct
- Check that the API key is valid
- Ensure network connectivity between Pi and PiAlert

## Manual Testing

Test the relay manually via API:

```bash
# Turn relay ON
curl -X POST http://localhost:5000/api/relay/on

# Turn relay OFF
curl -X POST http://localhost:5000/api/relay/off

# Toggle relay
curl -X POST http://localhost:5000/api/relay/toggle

# Check status
curl http://localhost:5000/api/status
```

## Development

### Run Without Docker

```bash
npm install
node app.js
```

Note: Requires Node.js 18+ and proper GPIO permissions.

### Project Structure

```
.
├── app.js              # Main application
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker compose configuration
└── public/
    └── index.html      # Web dashboard UI
```

## API Endpoints

- `GET /` - Web dashboard
- `GET /api/status` - Current relay and alert status
- `GET /api/history` - Poll history (last 50 entries)
- `POST /api/relay/on` - Turn relay ON
- `POST /api/relay/off` - Turn relay OFF
- `POST /api/relay/toggle` - Toggle relay state
- `GET /health` - Health check endpoint

## License

MIT

## Contributing

Pull requests welcome! Please test on actual hardware before submitting.

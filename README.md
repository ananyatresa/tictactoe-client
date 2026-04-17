# Multiplayer Tic-Tac-Toe

A production-ready, real-time multiplayer Tic-Tac-Toe game built with
React and Nakama's server-authoritative architecture.

## Live Demo

![alt text](<Screenshot 2026-04-17 135123.png>)
![alt text](<Screenshot 2026-04-17 134721.png>)
![alt text](<Screenshot 2026-04-17 134743.png>)
![alt text](<Screenshot 2026-04-17 134945.png>)
![alt text](<Screenshot 2026-04-17 135020.png>)
![alt text](<Screenshot 2026-04-17 135109.png>)

## Tech Stack

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| Frontend         | React JS                      |
| Game Backend     | Nakama (server-authoritative) |
| Database         | PostgreSQL                    |
| Frontend Hosting | DigitalOcean (Nginx)          |
| Server Hosting   | DigitalOcean Droplet          |

---

## Architecture & Design Decisions

### Server-Authoritative Architecture

All game logic runs on the Nakama server — the client never
decides game state. This prevents cheating and ensures consistency
across all connected clients.

### Real-time Communication

WebSocket connection between React client and Nakama server.
All game state updates are pushed from server to clients instantly.

### Op Code Protocol

| Code              | Direction       | Meaning                      |
| ----------------- | --------------- | ---------------------------- |
| 1 (START)         | Server → Client | Game started, marks assigned |
| 2 (UPDATE)        | Server → Client | Board updated                |
| 3 (DONE)          | Server → Client | Game over                    |
| 4 (MOVE)          | Client → Server | Player move                  |
| 5 (REJECTED)      | Server → Client | Invalid move                 |
| 6 (OPPONENT_LEFT) | Server → Client | Opponent disconnected        |
| 7 (INVITE_AI)     | Client → Server | Invite AI opponent           |

### Matchmaking

- Player calls `find_match_js` RPC on Nakama
- Server queries open matches with matching game mode
- If found → player joins existing match
- If not found → new match created
- Supports Normal mode (20s/turn) and Fast mode (10s/turn)

### Game Modes

- **Normal mode** — 20 seconds per turn
- **Fast mode** — 10 seconds per turn, auto-forfeit on timeout

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- Docker Desktop
- Git

### Local Development

**1. Clone both repositories:**

```bash
git clone https://github.com/heroiclabs/nakama-project-template
git clone current repository url
```

**2. Start Nakama server:**

```bash
cd nakama-project-template
npm install
npx tsc
docker compose up -d
```

**3. Start React app:**

```bash
cd tictactoe-client
npm install
npm start
```

### Environment Variables

REACT_APP_NAKAMA_HOST=GAME_URL
REACT_APP_NAKAMA_PORT=7350
CI=false

---

## Deployment

### Nakama Server (DigitalOcean)

**1. Create Ubuntu 22.04 droplet on DigitalOcean**

**2. Install Docker:**

```bash
apt-get update
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install docker-compose-plugin -y
```

**3. Clone and start Nakama:**

```bash
git clone https://github.com/heroiclabs/nakama-project-template /root/nakama
cd /root/nakama
```

**4. Upload compiled index.js:**

```bash
# On local machine
npx tsc
scp -i ~/.ssh/id_rsa build/index.js root@YOUR_IP:/root/nakama/modules/build/index.js
```

**5. Start containers:**

```bash
docker compose up -d
```

**6. Open ports:**

```bash
ufw allow 22
ufw allow 80
ufw allow 7350
ufw allow 7351
ufw enable
```

### Frontend (Nginx on same droplet)

**1. Install Nginx:**

```bash
apt-get install -y nginx
```

**2. Build and upload React:**

```bash
# Local machine
npm run build
scp -i ~/.ssh/id_rsa -r build/ root@YOUR_IP:/var/www/html/build
```

**3. Configure Nginx:**

```nginx
server {
    listen 80;
    root /var/www/html/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
systemctl restart nginx
```

---

## API & Server Configuration

### Nakama Configuration (local.yml)

- Server key: `defaultkey`
- HTTP port: `7350`
- Console port: `7351`
- Tick rate: `5` per second
- Max empty match duration: `30` seconds
- Delay between games: `5` seconds

### Nakama RPC Endpoints

| RPC ID          | Description            |
| --------------- | ---------------------- |
| `find_match_js` | Find or create a match |
| `rewards_js`    | Daily reward system    |

---

## How to Test Multiplayer

1. Open Game_URL in **two different browsers**
   (e.g. Chrome and Firefox) or two different devices
2. Click **Find Match** in both windows
3. Both players will be matched automatically
4. Player assigned X goes first
5. Click any empty cell to make your move
6. First to get 3 in a row wins

### Test Fast Mode

1. Click **Fast Mode ⚡** in both windows
2. Each player has 10 seconds per turn
3. Failing to move in time forfeits the turn

---

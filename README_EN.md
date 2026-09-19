# Chicken Rush

> English | **[简体中文](./README.md)**

A 4-player online real-time chase game built with Canvas + Socket.IO.

---

## Game Modes

### Classic (1 Chicken vs 3 Eagles)

- Chicken gets a 5-second head start before eagles chase
- Chicken sees the full map and eagle positions; eagles cannot see the chicken
- Eagles can pick up a reveal card to expose the chicken's position for 5 seconds
- Eagles win by catching the chicken within 5 minutes; otherwise chicken wins

### Eagle Hunt (1 Eagle vs 3 Chickens)

- Requires 4 players; the eagle hunts chickens one by one
- Eagle wins by catching all chickens; surviving chickens win when time runs out

---

## Tech Stack

| Layer | Technology |
|------|------|
| Frontend | HTML5 Canvas + Vanilla JavaScript |
| Networking | Socket.IO |
| Backend | Node.js + Express |
| Maze Generation | DFS + Dead-end removal + Random wall breaking |

---

## Quick Start

### Requirements

- Node.js >= 14
- npm

### Install & Run

```bash
git clone https://github.com/GHKyle/catch-game.git
cd catch-game
npm install
npm start
```

Open `http://localhost:3000` in your browser to play.

### Development

```bash
npm run dev
```

Uses nodemon for hot-reloading; server auto-restarts on changes.

---

## Project Structure

```
catch-game/
├── client/                  # Frontend
│   ├── index.html           # Entry page
│   ├── css/style.css        # Dark theme, glassmorphism, responsive
│   └── js/
│      ├── main.js           # Bootstrap
│      ├── Game.js           # Game core logic
│      ├── Renderer.js       # Canvas renderer
│      ├── InputHandler.js   # Keyboard + mobile touch
│      └── Network.js        # Socket.IO client
├── server/                  # Backend
│   ├── index.js             # Express + Socket.IO server
│   └── game/
│      ├── GameRoom.js       # Room management
│      ├── Maze.js           # Maze generation
│      └── Player.js         # Player class
├── package.json
└── start.bat                # Windows one-click launcher
```

---

## Controls

| Platform | Controls |
|------|------|
| PC | Arrow keys / WASD |
| Mobile | Virtual D-pad or swipe on canvas |

---

## Features

- Dark cyberpunk map with smart corridor border rendering
- Gradient ball characters with hand-drawn faces and glow effects
- Particle trail effects on movement
- Rotating reveal card with pulse animation
- Vignette fog effect
- Mobile: safe area insets, landscape/portrait, zoom lock
- Auto room matching, auto-start when full

# 小鸡快跑 | Chicken Rush

4人在线实时追逐游戏 — 基于 Canvas + Socket.IO 的多人联机迷宫追逐游戏。

A 4-player online real-time chase game built with Canvas + Socket.IO.

---

## 游戏模式 | Game Modes

### 经典模式 Classic（1鸡 3鹰 | 1 Chicken vs 3 Eagles）

- 小鸡先跑 5 秒，然后老鹰开始追逐
- Chicken gets a 5-second head start before eagles chase
- 小鸡可以看到全图和老鹰位置，老鹰看不到小鸡
- Chicken sees the full map and eagle positions; eagles cannot see the chicken
- 老鹰触碰显示卡可暴露小鸡位置 5 秒
- Eagles can pick up a reveal card to expose the chicken's position for 5 seconds
- 5 分钟内老鹰抓到小鸡则老鹰胜，否则小鸡胜
- Eagles win by catching the chicken within 5 minutes; otherwise chicken wins

### 老鹰捉小鸡模式 Eagle Hunt（1鹰 3鸡 | 1 Eagle vs 3 Chickens）

- 需要满 4 人才能开始，老鹰逐个抓小鸡
- Requires 4 players; the eagle hunts chickens one by one
- 抓完所有小鸡则老鹰胜，小鸡存活至时间结束则小鸡胜
- Eagle wins by catching all chickens; surviving chickens win when time runs out

---

## 技术栈 | Tech Stack

| 层级 Layer | 技术 Technology |
|------|------|
| 前端渲染 Frontend | HTML5 Canvas + Vanilla JavaScript |
| 实时通信 Networking | Socket.IO |
| 后端 Backend | Node.js + Express |
| 迷宫生成 Maze | DFS + Dead-end removal + Random wall breaking |

---

## 快速开始 | Quick Start

### 环境要求 Requirements

- Node.js >= 14
- npm

### 安装与运行 Install & Run

```bash
# 克隆仓库 Clone
git clone https://github.com/GHKyle/catch-game.git
cd catch-game

# 安装依赖 Install dependencies
npm install

# 启动服务器 Start server
npm start
```

浏览器打开 `http://localhost:3000` 即可游玩。
Open `http://localhost:3000` in your browser to play.

### 开发模式 Development

```bash
npm run dev
```

使用 nodemon 热重载，修改服务端代码自动重启。
Uses nodemon for hot-reloading; server auto-restarts on changes.

---

## 项目结构 | Project Structure

```
catch-game/
├── client/                  # 前端 Frontend
│   ├── index.html           # 入口页面 Entry page
│   ├── css/style.css        # 样式 Dark theme, glassmorphism, responsive
│   └── js/
│      ├── main.js           # 入口初始化 Bootstrap
│      ├── Game.js           # 游戏主逻辑 Game core logic
│      ├── Renderer.js       # Canvas 渲染器 Map, characters, particles
│      ├── InputHandler.js   # 输入处理 Keyboard + mobile touch
│      └── Network.js        # 网络通信 Socket.IO client
├── server/                  # 后端 Backend
│   ├── index.js             # Express + Socket.IO 服务 Server
│   └── game/
│      ├── GameRoom.js       # 房间管理 Room management & game logic
│      ├── Maze.js           # 迷宫生成 Maze generation
│      └── Player.js         # 玩家类 Player class
├── package.json
└── start.bat                # Windows 一键启动 One-click launcher
```

---

## 操作方式 | Controls

| 平台 Platform | 操作 Controls |
|------|------|
| PC | 方向键 / WASD Arrow keys / WASD |
| 手机 Mobile | 虚拟方向键 Virtual D-pad 或 在画布上滑动 Swipe on canvas |

---

## 游戏特性 | Features

- 暗色赛博风地图，通道智能边框渲染 — Dark cyberpunk map with smart corridor border rendering
- 渐变球体角色 + 手绘表情 + 外层发光 — Gradient球 characters with hand-drawn faces and glow effects
- 移动粒子拖尾特效 — Particle trail effects on movement
- 显示卡旋转动画 + 脉冲光圈 — Rotating reveal card with pulse animation
- 迷雾暗角效果 — Vignette fog effect
- 手机适配：安全区域、横竖屏、防缩放 — Mobile: safe area insets, landscape/portrait, zoom lock
- 自动匹配房间，满员自动开局 — Auto room matching, auto-start when full

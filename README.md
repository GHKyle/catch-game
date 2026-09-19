# 小鸡快跑(catch-game)

> **[English](./README_EN.md)** | 简体中文

4人在线实时追逐游戏 — 基于 Canvas + Socket.IO 的多人联机迷宫追逐游戏。

---

## 游戏模式

### 经典模式（1鸡 3鹰）

- 小鸡先跑 5 秒，然后老鹰开始追逐
- 小鸡可以看到全图和老鹰位置，老鹰看不到小鸡
- 老鹰触碰显示卡可暴露小鸡位置 5 秒
- 5 分钟内老鹰抓到小鸡则老鹰胜，否则小鸡胜

### 老鹰捉小鸡模式（1鹰 3鸡）

- 需要满 4 人才能开始，老鹰逐个抓小鸡
- 抓完所有小鸡则老鹰胜，小鸡存活至时间结束则小鸡胜

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端渲染 | HTML5 Canvas + Vanilla JavaScript |
| 实时通信 | Socket.IO |
| 后端 | Node.js + Express |
| 迷宫生成 | DFS + 死胡同消除 + 随机破墙 |

---

## 快速开始

### 环境要求

- Node.js >= 14
- npm

### 安装与运行

```bash
git clone https://github.com/GHKyle/catch-game.git
cd catch-game
npm install
npm start
```

浏览器打开 `http://localhost:3000` 即可游玩。

### 开发模式

```bash
npm run dev
```

使用 nodemon 热重载，修改服务端代码自动重启。

---

## 项目结构

```
catch-game/
├── client/                  # 前端
│   ├── index.html           # 入口页面
│   ├── css/style.css        # 样式（暗色主题、玻璃拟态、响应式）
│   └── js/
│      ├── main.js           # 入口初始化
│      ├── Game.js           # 游戏主逻辑
│      ├── Renderer.js       # Canvas 渲染器
│      ├── InputHandler.js   # 输入处理
│      └── Network.js        # 网络通信
├── server/                  # 后端
│   ├── index.js             # Express + Socket.IO 服务
│   └── game/
│      ├── GameRoom.js       # 房间管理
│      ├── Maze.js           # 迷宫生成
│      └── Player.js         # 玩家类
├── package.json
└── start.bat                # Windows 一键启动
```

---

## 操作方式

| 平台 | 操作 |
|------|------|
| PC | 方向键 / WASD |
| 手机 | 虚拟方向键 或 在画布上滑动 |

---

## 游戏特性

- 暗色赛博风地图，通道智能边框渲染
- 渐变球体角色 + 手绘表情 + 外层发光
- 移动粒子拖尾特效
- 显示卡旋转动画 + 脉冲光圈
- 迷雾暗角效果
- 手机适配：安全区域、横竖屏、防缩放
- 自动匹配房间，满员自动开局

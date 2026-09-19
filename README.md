# 小鸡快跑

4人在线实时追逐游戏 — 小鸡快跑！基于 Canvas + Socket.IO 的多人联机迷宫追逐游戏。

## 游戏截图

深色赛博风地图，精致角色绘制，粒子拖尾特效，支持手机触控。

## 游戏模式

### 经典模式（1鸡 3鹰）

- 1 只小鸡 vs 3 只老鹰
- 小鸡先跑 5 秒，然后老鹰开始追逐
- 小鸡可以看到全图和老鹰位置，老鹰看不到小鸡
- 老鹰触碰显示卡可暴露小鸡位置 5 秒
- 5 分钟内老鹰抓到小鸡则老鹰胜，否则小鸡胜

### 老鹰捉小鸡模式（1鹰 3鸡）

- 1 只老鹰 vs 3 只小鸡
- 需要满 4 人才能开始
- 老鹰逐个抓小鸡，抓完所有小鸡则老鹰胜
- 剩余小鸡存活至时间结束则小鸡胜

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端渲染 | HTML5 Canvas + 纯 JavaScript |
| 实时通信 | Socket.IO |
| 后端 | Node.js + Express |
| 迷宫生成 | DFS 深度优先搜索 + 死胡同消除 + 随机破墙 |

## 快速开始

### 环境要求

- Node.js >= 14
- npm

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/GHKyle/catch-game.git
cd catch-game

# 安装依赖
npm install

# 启动服务器
npm start
```

浏览器打开 `http://localhost:3000` 即可游玩。

### 开发模式

```bash
npm run dev
```

使用 nodemon 热重载，修改服务端代码自动重启。

## 项目结构

```
catch-game/
├── client/                # 前端
│   ├── index.html         # 入口页面
│   ├── css/style.css      # 样式（暗色主题、玻璃拟态、响应式）
│   └── js/
│       ├── main.js        # 入口初始化
│       ├── Game.js        # 游戏主逻辑
│       ├── Renderer.js    # Canvas 渲染器（地图/角色/粒子）
│       ├── InputHandler.js # 键盘 + 移动端触控输入
│       └── Network.js     # Socket.IO 网络通信
├── server/                # 后端
│   ├── index.js           # Express + Socket.IO 服务
│   └── game/
│       ├── GameRoom.js    # 房间管理、游戏逻辑
│       ├── Maze.js        # 迷宫生成算法
│       └── Player.js      # 玩家类
├── package.json
└── start.bat              # Windows 一键启动
```

## 操作方式

| 平台 | 操作 |
|------|------|
| PC | 方向键 / WASD |
| 手机 | 底部虚拟方向键 或 在画布上滑动 |

## 游戏特性

- 暗色赛博风地图，通道智能边框渲染
- 渐变球体角色 + 手绘表情 + 外层发光
- 移动粒子拖尾特效
- 显示卡旋转动画 + 脉冲光圈
- 迷雾暗角效果
- 手机适配：安全区域、横竖屏、防缩放
- 自动匹配房间，满员自动开局

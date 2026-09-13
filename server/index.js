const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameRoom = require('./game/GameRoom');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '../client')));

// 游戏房间管理
const rooms = new Map();
let roomIdCounter = 1;

// 获取或创建房间
function getOrCreateRoom() {
    // 查找可用的房间（等待中且未满员的房间）
    for (const [id, room] of rooms) {
        if (room.state === 'waiting' && room.players.size < room.maxPlayers) {
            return room;
        }
    }

    // 创建新房间
    const roomId = `room_${roomIdCounter++}`;
    const room = new GameRoom(roomId, io);
    rooms.set(roomId, room);
    console.log(`创建新房间: ${roomId}`);
    return room;
}

// Socket.IO连接处理
io.on('connection', (socket) => {
    console.log(`玩家连接: ${socket.id}`);
    let currentRoom = null;

    // 玩家加入游戏
    socket.on('joinGame', (data) => {
        console.log(`joinGame event received from ${socket.id}:`, data);
        const playerName = data.name || '玩家';
        const gameMode = data.gameMode || 'classic'; // 默认经典模式
        const room = getOrCreateRoom();
        
        // 只有房主或房间为空时才能设置游戏模式
        if (!room.hostId || room.hostId === socket.id || room.players.size === 0) {
            room.setGameMode(gameMode);
        }
        
        // 先加入socket房间，再添加玩家（这样第4个玩家能收到gameStarted事件）
        socket.join(room.id);
        currentRoom = room;
        
        console.log(`Adding ${playerName} to room ${room.id}, mode: ${room.gameMode}`);
        
        // 先发送joinedRoom给玩家（避免第4个玩家因gameStarted先到而被joinedRoom覆盖）
        const playerCount = room.players.size + 1; // 预计算加入后的人数
        socket.emit('joinedRoom', {
            roomId: room.id,
            playerId: socket.id,
            playerName,
            playerCount: playerCount,
            maxPlayers: room.maxPlayers,
            hostId: room.hostId || socket.id,
            gameMode: room.gameMode
        });

        const result = room.addPlayer(socket.id, playerName);

        if (result.success) {
            console.log(`玩家 ${playerName} 加入房间 ${room.id}`);
            // 通知房间内所有人更新房主信息
            io.to(room.id).emit('hostUpdate', {
                hostId: room.hostId,
                gameMode: room.gameMode
            });
        } else {
            console.log(`Failed to add ${playerName} to room: ${result.message}`);
            socket.leave(room.id);
            socket.emit('joinError', { message: result.message });
        }
    });

    // 玩家移动
    socket.on('move', (data) => {
        if (currentRoom) {
            currentRoom.handlePlayerMove(socket.id, data.direction);
        }
    });

    // 房主提前开始游戏
    socket.on('startGameEarly', () => {
        if (currentRoom && currentRoom.hostId === socket.id) {
            if (currentRoom.state !== 'waiting') return;
            // 老鹰捉小鸡模式必须满4人才能开始，经典模式2人即可
            const minPlayers = currentRoom.gameMode === 'eagle_hunt' ? 4 : 2;
            if (currentRoom.players.size >= minPlayers) {
                currentRoom.startGame();
            } else {
                socket.emit('joinError', { message: `至少需要${minPlayers}人才能开始游戏` });
            }
        }
    });

    // 玩家断开连接
    socket.on('disconnect', () => {
        console.log(`玩家断开连接: ${socket.id}`);
        if (currentRoom) {
            const wasHost = currentRoom.hostId === socket.id;
            currentRoom.removePlayer(socket.id);
            // 如果房主离开了，通知所有人新的房主
            if (wasHost && currentRoom.hostId) {
                io.to(currentRoom.id).emit('hostUpdate', {
                    hostId: currentRoom.hostId
                });
            }
        }
    });

    // 获取房间列表
    socket.on('getRooms', () => {
        const roomList = [];
        rooms.forEach((room, id) => {
            roomList.push({
                id,
                playerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                state: room.state
            });
        });
        socket.emit('roomList', roomList);
    });
});

// 定期清理空房间
setInterval(() => {
    for (const [id, room] of rooms) {
        if (room.players.size === 0 && room.state === 'waiting') {
            rooms.delete(id);
            console.log(`清理空房间: ${id}`);
        }
    }
}, 60000); // 每分钟清理一次

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`游戏服务器已启动，等待玩家连接...`);
});

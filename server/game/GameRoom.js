const Maze = require('./Maze');
const Player = require('./Player');

/**
 * 游戏房间类
 * 管理游戏房间的状态、玩家和游戏逻辑
 */
class GameRoom {
    constructor(id, io) {
        this.id = id;
        this.io = io;
        this.players = new Map(); // 玩家列表
        this.maze = null; // 迷宫对象
        this.state = 'waiting'; // waiting, playing, finished
        this.maxPlayers = 4;
        this.chicken = null; // 小鸡玩家
        this.eagles = []; // 老鹰玩家列表
        this.gameTimer = null; // 游戏计时器
        this.waitTimer = null; // 等待计时器
        this.gameStartTime = null; // 游戏开始时间
        this.gameDuration = 5 * 60 * 1000; // 游戏时长5分钟
        this.chickenReadyTime = 5 * 1000; // 小鸡先跑5秒
        this.winner = null; // 获胜者
        this.revealCard = null; // 显示卡位置 {x, y}
        this.revealTimer = null; // 显示卡效果计时器
        this.hostId = null; // 房主（第一个加入的玩家）
    }

    /**
     * 玩家加入房间
     */
    addPlayer(playerId, playerName) {
        console.log(`addPlayer called: ${playerName} (${playerId}), room state: ${this.state}, players: ${this.players.size}/${this.maxPlayers}`);
        
        if (this.state !== 'waiting') {
            console.log(`Room ${this.id} is not waiting, state: ${this.state}`);
            return { success: false, message: '游戏已经开始' };
        }

        if (this.players.size >= this.maxPlayers) {
            console.log(`Room ${this.id} is full: ${this.players.size}/${this.maxPlayers}`);
            return { success: false, message: '房间已满' };
        }

        const player = new Player(playerId, playerName);
        this.players.set(playerId, player);

        // 记录房主（第一个加入的玩家）
        if (!this.hostId) {
            this.hostId = playerId;
        }

        console.log(`Player ${playerName} added to room ${this.id}. Total players: ${this.players.size}`);

        // 通知所有玩家
        this.io.to(this.id).emit('playerJoined', {
            playerId,
            playerName,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers
        });

        // 检查是否满员
        if (this.players.size === this.maxPlayers) {
            console.log(`Room ${this.id} is full, starting game...`);
            this.startGame();
        }

        return { success: true, player };
    }

    /**
     * 玩家离开房间
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            return;
        }

        this.players.delete(playerId);

        // 如果房主离开，转移给第一个剩余玩家
        if (this.hostId === playerId && this.state === 'waiting') {
            const remaining = Array.from(this.players.keys());
            this.hostId = remaining.length > 0 ? remaining[0] : null;
        }

        // 如果游戏正在进行，处理玩家离开
        if (this.state === 'playing') {
            // 如果离开的是小鸡，游戏结束，老鹰获胜
            if (this.chicken && this.chicken.getId() === playerId) {
                this.endGame('eagle', null);
            }
            // 如果离开的是老鹰，检查是否所有老鹰都离开了
            else if (player.getRole() === 'eagle') {
                this.eagles = this.eagles.filter(e => e.getId() !== playerId);
                if (this.eagles.length === 0) {
                    this.endGame('chicken', null);
                }
            }
        }

        // 通知所有玩家
        this.io.to(this.id).emit('playerLeft', {
            playerId,
            playerCount: this.players.size
        });

        // 如果房间空了，清理房间
        if (this.players.size === 0) {
            this.cleanup();
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        if (this.state !== 'waiting') return; // 防止重复开始
        console.log(`startGame called for room ${this.id}`);
        this.state = 'playing';
        this.hostId = null; // 游戏开始后清除房主
        this.maze = new Maze(20, 20);

        // 随机选择小鸡
        const playerIds = Array.from(this.players.keys());
        const chickenIndex = Math.floor(Math.random() * playerIds.length);
        const chickenId = playerIds[chickenIndex];

        console.log(`Chicken selected: ${chickenId}`);

        // 分配角色
        this.players.forEach((player, id) => {
            if (id === chickenId) {
                player.setRole('chicken');
                this.chicken = player;
                console.log(`Player ${player.getName()} is chicken`);
            } else {
                player.setRole('eagle');
                this.eagles.push(player);
                console.log(`Player ${player.getName()} is eagle`);
            }
        });

        // 设置初始位置
        this.setInitialPositions();

        // 随机投放显示卡
        this.spawnRevealCard();

        // 通知所有玩家游戏开始
        const gameStartedData = {
            maze: this.maze.serialize(),
            players: this.getPlayersState(),
            chickenId: this.chicken.getId(),
            gameDuration: this.gameDuration,
            chickenReadyTime: this.chickenReadyTime,
            revealCard: this.revealCard
        };
        
        console.log(`Emitting gameStarted to room ${this.id}`);
        this.io.to(this.id).emit('gameStarted', gameStartedData);

        // 小鸡先跑5秒
        this.chicken.setCanMove(true);
        this.io.to(this.id).emit('chickenReady', {
            message: '小鸡先跑5秒！'
        });

        // 5秒后老鹰开始移动
        this.waitTimer = setTimeout(() => {
            this.eagles.forEach(eagle => {
                eagle.setCanMove(true);
            });
            this.io.to(this.id).emit('eaglesReady', {
                message: '老鹰开始追逐！'
            });

            // 记录游戏开始时间
            this.gameStartTime = Date.now();

            // 开始游戏计时器
            this.startGameTimer();
        }, this.chickenReadyTime);
    }

    /**
     * 设置初始位置
     */
    setInitialPositions() {
        // 小鸡从左上角附近开始
        const chickenPos = this.maze.getRandomWalkablePosition();
        this.chicken.setPosition(chickenPos.x, chickenPos.y);

        // 老鹰从右下角附近开始
        this.eagles.forEach(eagle => {
            let pos;
            do {
                pos = this.maze.getRandomWalkablePosition();
            } while (
                Math.abs(pos.x - chickenPos.x) < 5 ||
                Math.abs(pos.y - chickenPos.y) < 5
            );
            eagle.setPosition(pos.x, pos.y);
        });
    }

    /**
     * 开始游戏计时器
     */
    startGameTimer() {
        this.gameTimer = setTimeout(() => {
            // 时间到，小鸡获胜
            this.endGame('chicken');
        }, this.gameDuration);
    }

    /**
     * 处理玩家移动
     */
    handlePlayerMove(playerId, direction) {
        const player = this.players.get(playerId);
        if (!player || this.state !== 'playing') {
            return;
        }

        // 尝试移动
        const moved = player.move(direction, this.maze);
        if (!moved) {
            return;
        }

        // 检查碰撞
        if (this.checkCollisions()) {
            return;
        }

        // 如果是老鹰，检查是否踩到显示卡
        if (player.getRole() === 'eagle') {
            this.checkRevealCard(player);
        }

        // 广播玩家位置更新
        this.io.to(this.id).emit('playerMoved', {
            playerId,
            x: player.getPosition().x,
            y: player.getPosition().y,
            direction: player.direction
        });
    }

    /**
     * 检查碰撞
     */
    checkCollisions() {
        if (!this.chicken) {
            return false;
        }

        // 检查每只老鹰是否碰到小鸡
        for (const eagle of this.eagles) {
            if (this.chicken.checkCollision(eagle)) {
                // 记录抓住小鸡的老鹰，老鹰获胜
                this.endGame('eagle', eagle);
                return true;
            }
        }

        return false;
    }

    /**
     * 随机投放显示卡
     */
    spawnRevealCard() {
        if (this.state !== 'playing' || !this.maze) return;
        const pos = this.maze.getRandomWalkablePosition();
        // 确保不在玩家当前位置上
        this.revealCard = { x: pos.x, y: pos.y };
        console.log(`Display card spawned at (${pos.x}, ${pos.y})`);
    }

    /**
     * 检查老鹰是否踩到显示卡
     */
    checkRevealCard(eagle) {
        if (!this.revealCard || this.revealTimer) return;

        const pos = eagle.getPosition();
        if (pos.x === this.revealCard.x && pos.y === this.revealCard.y) {
            this.activateRevealCard();
        }
    }

    /**
     * 激活显示卡效果：展示小鸡位置3秒
     */
    activateRevealCard() {
        this.revealCard = null; // 卡片被拾取

        // 通知所有玩家小鸡位置暴露
        this.io.to(this.id).emit('chickenRevealed', {
            x: this.chicken.getPosition().x,
            y: this.chicken.getPosition().y
        });
        console.log('Display card activated! Chicken position revealed.');

        // 3秒后隐藏小鸡，然后检查是否需要重新投放
        this.revealTimer = setTimeout(() => {
            this.io.to(this.id).emit('chickenHidden', {
                message: '显示效果结束，小鸡再次隐藏！'
            });
            this.revealTimer = null;
            console.log('Chicken position hidden again.');

            // 检查剩余时间，如果超过1分钟则重新投放显示卡
            if (this.state === 'playing' && this.gameStartTime) {
                const elapsed = Date.now() - this.gameStartTime;
                const remaining = this.gameDuration - elapsed;
                if (remaining > 60000) {
                    // 1分钟后重新投放
                    setTimeout(() => {
                        if (this.state === 'playing') {
                            this.spawnRevealCard();
                            this.io.to(this.id).emit('revealCardSpawned', {
                                message: '新的显示卡已刷新！',
                                revealCard: this.revealCard
                            });
                            console.log('New display card spawned.');
                        }
                    }, 60000);
                } else {
                    console.log('剩余时间不足1分钟，不再投放显示卡。');
                }
            }
        }, 3000);
    }

    /**
     * 结束游戏
     */
    endGame(winner, capturedBy) {
        this.state = 'finished';
        this.winner = winner;

        // 清理计时器
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.waitTimer) {
            clearTimeout(this.waitTimer);
            this.waitTimer = null;
        }
        if (this.revealTimer) {
            clearTimeout(this.revealTimer);
            this.revealTimer = null;
        }

        // 构建结束数据
        const endData = {
            winner,
            message: winner === 'chicken' ? '小鸡获胜！' : '老鹰获胜！',
            players: this.getPlayersState()
        };

        // 如果是老鹰获胜，附带抓住小鸡的老鹰信息
        if (winner === 'eagle' && capturedBy) {
            endData.capturedBy = {
                id: capturedBy.getId(),
                name: capturedBy.getName()
            };
        }

        // 如果是小鸡获胜（时间到），附带小鸡最终位置
        if (winner === 'chicken' && this.chicken) {
            endData.chickenPosition = this.chicken.getPosition();
        }

        // 通知所有玩家游戏结束
        this.io.to(this.id).emit('gameEnded', endData);

        // 8秒后重置房间（留足时间让玩家看清结果）
        setTimeout(() => {
            this.resetRoom();
        }, 8000);
    }

    /**
     * 重置房间
     */
    resetRoom() {
        this.state = 'waiting';
        this.maze = null;
        this.chicken = null;
        this.eagles = [];
        this.gameStartTime = null;
        this.winner = null;
        this.revealCard = null;
        this.hostId = null;

        // 重置所有玩家
        this.players.forEach(player => {
            player.reset();
        });

        // 通知所有玩家房间已重置
        this.io.to(this.id).emit('roomReset', {
            message: '游戏结束，房间已重置'
        });
    }

    /**
     * 获取所有玩家状态
     */
    getPlayersState() {
        const playersState = {};
        this.players.forEach((player, id) => {
            playersState[id] = player.getState();
        });
        return playersState;
    }

    /**
     * 获取房间状态
     */
    getRoomState() {
        return {
            id: this.id,
            state: this.state,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            players: this.getPlayersState(),
            maze: this.maze ? this.maze.serialize() : null,
            chickenId: this.chicken ? this.chicken.getId() : null,
            gameStartTime: this.gameStartTime,
            gameDuration: this.gameDuration,
            winner: this.winner
        };
    }

    /**
     * 清理房间
     */
    cleanup() {
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
        }
        if (this.waitTimer) {
            clearTimeout(this.waitTimer);
        }
        if (this.revealTimer) {
            clearTimeout(this.revealTimer);
        }
        this.players.clear();
        this.maze = null;
        this.chicken = null;
        this.eagles = [];
        this.revealCard = null;
    }
}

module.exports = GameRoom;

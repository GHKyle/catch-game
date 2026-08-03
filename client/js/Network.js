/**
 * 网络通信类
 * 处理与服务器的Socket.IO通信
 */
class Network {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.callbacks = {};
    }

    /**
     * 连接服务器
     */
    connect() {
        console.log('Network.connect() called');
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('已连接到服务器, socket id:', this.socket.id);
            this.connected = true;
            this.trigger('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('已断开连接');
            this.connected = false;
            this.trigger('disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('连接错误:', error);
            this.trigger('error', error);
        });

        // 注册事件监听
        this.setupEventListeners();
        console.log('Network.connect() completed');
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 加入房间成功
        this.socket.on('joinedRoom', (data) => {
            console.log('加入房间成功:', data);
            this.trigger('joinedRoom', data);
        });

        // 加入房间失败
        this.socket.on('joinError', (data) => {
            console.error('加入房间失败:', data.message);
            this.trigger('joinError', data);
        });

        // 玩家加入
        this.socket.on('playerJoined', (data) => {
            console.log('玩家加入:', data);
            this.trigger('playerJoined', data);
        });

        // 玩家离开
        this.socket.on('playerLeft', (data) => {
            console.log('玩家离开:', data);
            this.trigger('playerLeft', data);
        });

        // 游戏开始
        this.socket.on('gameStarted', (data) => {
            console.log('游戏开始事件收到:', data);
            // 直接调用全局game对象处理
            if (typeof game !== 'undefined' && game.handleGameStarted) {
                game.handleGameStarted(data);
            }
            this.trigger('gameStarted', data);
        });

        // 小鸡准备
        this.socket.on('chickenReady', (data) => {
            console.log('小鸡准备:', data);
            this.trigger('chickenReady', data);
        });

        // 老鹰准备
        this.socket.on('eaglesReady', (data) => {
            console.log('老鹰准备:', data);
            this.trigger('eaglesReady', data);
        });

        // 玩家移动
        this.socket.on('playerMoved', (data) => {
            this.trigger('playerMoved', data);
        });

        // 游戏结束
        this.socket.on('gameEnded', (data) => {
            console.log('游戏结束:', data);
            this.trigger('gameEnded', data);
        });

        // 小鸡位置暴露
        this.socket.on('chickenRevealed', (data) => {
            console.log('小鸡位置暴露:', data);
            this.trigger('chickenRevealed', data);
        });

        // 小鸡隐藏
        this.socket.on('chickenHidden', (data) => {
            console.log('小鸡再次隐藏:', data);
            this.trigger('chickenHidden', data);
        });

        // 新的显示卡刷新
        this.socket.on('revealCardSpawned', (data) => {
            console.log('新的显示卡已刷新:', data);
            this.trigger('revealCardSpawned', data);
        });

        // 房间重置
        this.socket.on('roomReset', (data) => {
            console.log('房间重置:', data);
            this.trigger('roomReset', data);
        });

        // 房间列表
        this.socket.on('roomList', (data) => {
            this.trigger('roomList', data);
        });

        // 房主更新
        this.socket.on('hostUpdate', (data) => {
            this.trigger('hostUpdate', data);
        });
    }

    /**
     * 加入游戏
     */
    joinGame(playerName) {
        console.log('joinGame called with:', playerName);
        if (!this.connected) {
            console.error('未连接到服务器');
            return;
        }
        console.log('Sending joinGame event to server');
        this.socket.emit('joinGame', { name: playerName });
    }

    /**
     * 发送移动指令
     */
    sendMove(direction) {
        if (!this.connected) {
            return;
        }
        this.socket.emit('move', { direction });
    }

    /**
     * 获取房间列表
     */
    getRooms() {
        if (!this.connected) {
            return;
        }
        this.socket.emit('getRooms');
    }

    /**
     * 房主发送提前开始游戏
     */
    sendStartGame() {
        if (!this.connected) return;
        this.socket.emit('startGameEarly');
    }

    /**
     * 注册回调函数
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * 触发事件
     */
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// 导出网络实例
const network = new Network();

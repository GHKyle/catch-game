/**
 * 游戏主逻辑类
 * 协调网络、输入、渲染等模块
 */
class Game {
    constructor() {
        this.state = 'login'; // login, waiting, playing, ended
        this.playerId = null;
        this.playerName = '';
        this.roomId = null;
        this.myRole = null;
        this.players = {};
        this.maze = null;
        this.gameStartTime = null;
        this.gameDuration = 0;
        this.timerInterval = null;
        this.animationFrame = null;
        this.revealCard = null; // 显示卡位置
        this.isHost = false; // 是否是房主
        this.playerCount = 0; // 当前房间人数
        this.gameMode = 'classic'; // 游戏模式：classic 或 eagle_hunt
    }

    /**
     * 初始化游戏
     */
    init() {
        console.log('Game.init() called');
        // 初始化网络
        network.connect();
        
        // 初始化输入处理
        inputHandler.init();
        
        // 设置事件监听
        this.setupNetworkEvents();
        this.setupInputEvents();
        this.setupUIEvents();
        
        // 开始游戏循环
        this.gameLoop();
        console.log('Game.init() completed');
    }

    /**
     * 处理游戏开始事件（直接调用）
     */
    handleGameStarted(data) {
        console.log('handleGameStarted called with:', data);
        
        this.state = 'playing';
        this.maze = data.maze;
        this.players = data.players;
        this.gameDuration = data.gameDuration;
        this.revealCard = data.revealCard || null;
        
        // 设置渲染器
        renderer.setMaze(this.maze);
        renderer.setPlayers(this.players);
        renderer.setRevealCard(this.revealCard);
        renderer.setChickenRevealed(false);
        
        // 确定我的角色
        if (data.chickenId === this.playerId) {
            this.myRole = 'chicken';
        } else {
            this.myRole = 'eagle';
        }
        
        console.log('My role:', this.myRole);
        renderer.setMyPlayer(this.playerId, this.myRole);
        
        // 显示游戏界面
        this.showScreen('game-screen');
        this.updateGameUI();
        
        // 重新调整Canvas大小
        setTimeout(function() {
            renderer.forceResize();
            renderer.render();
        }, 150);
        
        setTimeout(function() {
            renderer.forceResize();
            renderer.render();
        }, 600);
        
        // 启用输入
        inputHandler.enable();
        
        console.log('handleGameStarted处理完成');
    }

    /**
     * 设置网络事件监听
     */
    setupNetworkEvents() {
        // 连接成功
        network.on('connected', () => {
            console.log('已连接到服务器');
        });

        // 加入房间成功
        network.on('joinedRoom', (data) => {
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.state = 'waiting';
            this.playerCount = data.playerCount;
            this.isHost = (data.hostId === data.playerId);
            this.showScreen('waiting-screen');
            this.updateWaitingUI(data);
            this.updateStartButton();
        });

        // 加入房间失败
        network.on('joinError', (data) => {
            alert(data.message);
        });

        // 玩家加入
        network.on('playerJoined', (data) => {
            this.playerCount = data.playerCount;
            this.updateWaitingUI(data);
            this.updateStartButton();
        });

        // 玩家离开
        network.on('playerLeft', (data) => {
            this.playerCount = data.playerCount;
            this.updateWaitingUI(data);
            this.updateStartButton();
        });

        // 房主更新
        network.on('hostUpdate', (data) => {
            this.isHost = (data.hostId === this.playerId);
            if (data.gameMode) {
                this.gameMode = data.gameMode;
            }
            this.updateStartButton();
        });

        // 游戏开始
        network.on('gameStarted', (data) => {
            console.log('gameStarted event received');
            
            this.state = 'playing';
            this.maze = data.maze;
            this.players = data.players;
            this.gameDuration = data.gameDuration;
            this.revealCard = data.revealCard || null;
            this.gameMode = data.gameMode || 'classic';
            
            // 设置渲染器
            if (typeof renderer !== 'undefined') {
                renderer.setMaze(this.maze);
                renderer.setPlayers(this.players);
                renderer.setRevealCard(this.revealCard);
                renderer.setChickenRevealed(false);
            }
            
            // 确定我的角色
            if (this.gameMode === 'classic') {
                // 经典模式：检查是否是小鸡
                if (data.chickenId === this.playerId) {
                    this.myRole = 'chicken';
                } else {
                    this.myRole = 'eagle';
                }
            } else if (this.gameMode === 'eagle_hunt') {
                // 老鹰捉小鸡模式：检查是否在小鸡列表中
                if (data.chickenIds && data.chickenIds.includes(this.playerId)) {
                    this.myRole = 'chicken';
                } else {
                    this.myRole = 'eagle';
                }
            }
            
            console.log('My role:', this.myRole);
            
            if (typeof renderer !== 'undefined') {
                renderer.setMyPlayer(this.playerId, this.myRole);
            }
            
            // 显示游戏界面
            this.showScreen('game-screen');
            this.updateGameUI();
            
            // 重新调整Canvas大小
            var self = this;
            setTimeout(function() {
                if (typeof renderer !== 'undefined') {
                    renderer.forceResize();
                    renderer.render();
                }
            }, 150);
            
            setTimeout(function() {
                if (typeof renderer !== 'undefined') {
                    renderer.forceResize();
                    renderer.render();
                }
            }, 600);
            
            // 启用输入
            if (typeof inputHandler !== 'undefined') {
                inputHandler.enable();
            }
            
            // 更新游戏模式显示
            this.updateGameModeDisplay();
            
            console.log('gameStarted处理完成');
        });

        // 小鸡准备
        network.on('chickenReady', (data) => {
            if (this.myRole === 'chicken') {
                renderer.drawHint('开始逃跑！');
            }
        });

        // 老鹰准备
        network.on('eaglesReady', (data) => {
            if (this.myRole === 'eagle') {
                renderer.drawHint('开始追逐！');
            }
            
            // 开始计时
            this.gameStartTime = Date.now();
            this.startTimer();
        });

        // 玩家移动
        network.on('playerMoved', (data) => {
            if (this.players[data.playerId]) {
                this.players[data.playerId].x = data.x;
                this.players[data.playerId].y = data.y;
                this.players[data.playerId].direction = data.direction;
                renderer.setPlayers(this.players);
            }
        });

        // 游戏结束
        network.on('gameEnded', (data) => {
            this.state = 'ended';
            this.stopTimer();
            inputHandler.disable();
            
            // 游戏结束时，显示所有小鸡在地图上的位置
            renderer.setChickenRevealed(true);
            
            // 老鹰获胜：更新被抓小鸡的最终位置
            if (data.winner === 'eagle' && data.chickenPosition) {
                for (const playerId in this.players) {
                    if (this.players[playerId].role === 'chicken') {
                        this.players[playerId].x = data.chickenPosition.x;
                        this.players[playerId].y = data.chickenPosition.y;
                        break;
                    }
                }
                renderer.setPlayers(this.players);
            }
            
            // 小鸡获胜：更新小鸡最终位置
            if (data.winner === 'chicken' && data.chickenPosition) {
                for (const playerId in this.players) {
                    if (this.players[playerId].role === 'chicken') {
                        this.players[playerId].x = data.chickenPosition.x;
                        this.players[playerId].y = data.chickenPosition.y;
                        break;
                    }
                }
                renderer.setPlayers(this.players);
            }
            
            // 在游戏画面上显示结果
            this.showGameEndOverlay(data);
            
            // 5秒后切换到结束界面
            setTimeout(() => {
                this.hideGameEndOverlay();
                this.showScreen('end-screen');
                this.updateEndUI(data);
            }, 5000);
        });

        // 显示卡被拾取，小鸡位置暴露
        network.on('chickenRevealed', (data) => {
            this.revealCard = null;
            renderer.setRevealCard(null);
            renderer.setChickenRevealed(true);
            // 根据角色显示不同提示
            if (this.myRole === 'chicken') {
                renderer.drawHint('老鹰可以看到你的位置3秒！');
            } else {
                renderer.drawHint('小鸡位置已暴露！');
            }
        });

        // 小鸡隐藏效果结束
        network.on('chickenHidden', (data) => {
            renderer.setChickenRevealed(false);
            renderer.drawHint(data.message || '小鸡再次隐藏！');
        });

        // 新的显示卡刷新
        network.on('revealCardSpawned', (data) => {
            this.revealCard = data.revealCard || null;
            renderer.setRevealCard(this.revealCard);
            renderer.drawHint(data.message || '新的显示卡已刷新！');
        });

        // 房间重置
        network.on('roomReset', (data) => {
            this.state = 'login';
            this.showScreen('login-screen');
            this.reset();
        });

        // 小鸡被抓到（老鹰捉小鸡模式）
        network.on('chickenCaptured', (data) => {
            // 从玩家列表中移除被抓到的小鸡，使其消失
            if (this.players[data.chickenId]) {
                delete this.players[data.chickenId];
                renderer.setPlayers(this.players);
            }
            // 如果是自己被抓到，显示被捕获提示并禁用输入
            if (data.chickenId === this.playerId) {
                renderer.drawHint('你被老鹰抓住了！游戏结束！');
                inputHandler.disable();
            } else {
                // 显示提示信息
                renderer.drawHint(`小鸡 ${data.chickenName} 被抓住了！剩余 ${data.remainingChickens} 只小鸡`);
            }
            console.log(`小鸡 ${data.chickenName} 被抓住了。剩余 ${data.remainingChickens} 只小鸡`);
        });

        // 小鸡逃跑（老鹰捉小鸡模式）
        network.on('chickenEscaped', (data) => {
            // 从玩家列表中移除逃跑的小鸡，使其消失
            if (this.players[data.chickenId]) {
                delete this.players[data.chickenId];
                renderer.setPlayers(this.players);
            }
            // 显示提示信息
            renderer.drawHint(`小鸡 ${data.chickenName} 逃跑了！剩余 ${data.remainingChickens} 只小鸡`);
            console.log(`小鸡 ${data.chickenName} 逃跑了。剩余 ${data.remainingChickens} 只小鸡`);
        });
    }

    /**
     * 设置输入事件监听
     */
    setupInputEvents() {
        inputHandler.on('move', (direction) => {
            if (this.state === 'playing') {
                network.sendMove(direction);
            }
        });
    }

    /**
     * 设置UI事件监听
     */
    setupUIEvents() {
        // 加入游戏按钮
        const joinBtn = document.getElementById('join-btn');
        joinBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('player-name');
            const name = nameInput.value.trim();
            const modeSelect = document.getElementById('game-mode');
            const mode = modeSelect ? modeSelect.value : 'classic';
            if (name) {
                this.playerName = name;
                this.gameMode = mode;
                network.joinGame(name, mode);
            } else {
                alert('请输入你的名字');
            }
        });

        // 回车键加入游戏
        const nameInput = document.getElementById('player-name');
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinBtn.click();
            }
        });

        // 重新开始按钮
        const restartBtn = document.getElementById('restart-btn');
        restartBtn.addEventListener('click', () => {
            this.showScreen('login-screen');
            this.reset();
        });

        // 房主提前开始按钮
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                network.sendStartGame();
            });
        }
    }

    /**
     * 显示指定界面
     */
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            
            // 如果是游戏界面，触发resize事件
            if (screenId === 'game-screen') {
                window.dispatchEvent(new Event('resize'));
            }
        }
    }

    /**
     * 更新等待界面UI
     */
    updateWaitingUI(data) {
        const currentCount = document.getElementById('current-count');
        const maxCount = document.getElementById('max-count');
        const waitingPlayers = document.getElementById('waiting-players');
        
        if (currentCount) currentCount.textContent = data.playerCount;
        if (maxCount) maxCount.textContent = data.maxPlayers;
        
        // 更新房主提示
        const waitingMsg = document.querySelector('.waiting-message');
        if (waitingMsg) {
            if (this.isHost) {
                waitingMsg.textContent = '你是房主，人齐后可点击开始按钮';
            } else {
                waitingMsg.textContent = '等待房主开始游戏...';
            }
        }
        
        // 更新玩家槽位
        if (waitingPlayers) {
            waitingPlayers.innerHTML = '';
            for (let i = 0; i < data.maxPlayers; i++) {
                const slot = document.createElement('div');
                slot.className = 'player-slot';
                if (i < data.playerCount) {
                    slot.classList.add('occupied');
                    slot.textContent = '👤';
                } else {
                    slot.textContent = '?';
                }
                waitingPlayers.appendChild(slot);
            }
        }
    }

    /**
     * 更新开始按钮显示状态
     */
    updateStartButton() {
        const startBtn = document.getElementById('start-game-btn');
        if (!startBtn) return;

        // 老鹰捉小鸡模式需要满4人才能开始
        const minPlayers = this.gameMode === 'eagle_hunt' ? 4 : 2;
        if (this.isHost && this.playerCount >= minPlayers) {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    }

    /**
     * 更新游戏界面UI
     */
    updateGameUI() {
        const roleText = document.getElementById('role-text');
        const statusText = document.getElementById('status-text');
        
        if (roleText) {
            roleText.textContent = this.myRole === 'chicken' ? '小鸡' : '老鹰';
            roleText.className = this.myRole;
        }
        
        if (statusText) {
            statusText.textContent = '游戏中';
        }
    }

    /**
     * 更新游戏模式显示
     */
    updateGameModeDisplay() {
        // 在游戏信息栏添加游戏模式显示
        const infoBar = document.getElementById('game-info-bar');
        if (infoBar) {
            // 检查是否已经存在模式显示
            let modeDisplay = document.getElementById('mode-display');
            if (!modeDisplay) {
                modeDisplay = document.createElement('div');
                modeDisplay.id = 'mode-display';
                infoBar.insertBefore(modeDisplay, infoBar.firstChild);
            }
            
            const modeText = this.gameMode === 'classic' ? '经典模式' : '老鹰捉小鸡模式';
            modeDisplay.textContent = `模式: ${modeText}`;
        }
    }

    /**
     * 更新结束界面UI
     */
    updateEndUI(data) {
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const resultDetails = document.getElementById('result-details');
        
        if (resultTitle) {
            resultTitle.textContent = data.winner === 'chicken' ? '小鸡获胜！' : '老鹰获胜！';
        }
        
        if (resultMessage) {
            if (data.winner === 'chicken') {
                resultMessage.textContent = '小鸡成功躲避了所有老鹰的追捕！小鸡已在地图上显示！';
            } else if (data.capturedBy) {
                const catcherName = data.capturedBy.id === this.playerId
                    ? '你（' + data.capturedBy.name + '）'
                    : data.capturedBy.name;
                resultMessage.textContent = catcherName + ' 成功抓住了小鸡！';
            } else {
                resultMessage.textContent = '老鹰成功抓到了小鸡！';
            }
        }
        
        if (resultDetails) {
            let details = '';
            for (const playerId in data.players) {
                const player = data.players[playerId];
                const roleText = player.role === 'chicken' ? '小鸡' : '老鹰';
                const isMe = playerId === this.playerId ? ' (你)' : '';
                details += `${player.name}${isMe}: ${roleText}<br>`;
            }
            resultDetails.innerHTML = details;
        }
    }

    /**
     * 在游戏画面上显示结束结果遮罩
     */
    showGameEndOverlay(data) {
        let overlay = document.getElementById('game-end-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'game-end-overlay';
            document.getElementById('game-screen').appendChild(overlay);
        }
        
        const title = data.winner === 'chicken' ? '小鸡获胜！' : '老鹰获胜！';
        const message = data.winner === 'chicken'
            ? '小鸡成功躲避了所有老鹰的追捕！'
            : '小鸡被老鹰抓住了！';
        
        // 显示具体抓住小鸡的老鹰名称
        let detail = '';
        if (data.winner === 'eagle' && data.capturedBy) {
            const myName = data.capturedBy.name + (data.capturedBy.id === this.playerId ? ' (你)' : '');
            detail = myName + ' 成功抓住了小鸡！';
        }

        let chickenInfo = '';
        if (data.winner === 'chicken') {
            chickenInfo = '小鸡已在地图上显示！';
        }
        
        overlay.innerHTML = `
            <div class="end-overlay-title">${title}</div>
            <div class="end-overlay-message">${message}</div>
            ${detail ? '<div class="end-overlay-detail">' + detail + '</div>' : ''}
            ${chickenInfo ? '<div class="end-overlay-detail" style="color:#f1c40f">' + chickenInfo + '</div>' : ''}
        `;
        overlay.classList.remove('hidden');
    }

    /**
     * 隐藏游戏结束遮罩
     */
    hideGameEndOverlay() {
        const overlay = document.getElementById('game-end-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * 开始计时器
     */
    startTimer() {
        const timerText = document.getElementById('timer-text');
        
        this.timerInterval = setInterval(() => {
            if (!this.gameStartTime) return;
            
            const elapsed = Date.now() - this.gameStartTime;
            const remaining = Math.max(0, this.gameDuration - elapsed);
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            if (timerText) {
                timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // 时间快到时闪烁提示
            if (remaining < 30000) {
                timerText.style.color = '#e74c3c';
                timerText.style.animation = 'pulse 1s infinite';
            }
        }, 1000);
    }

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 游戏主循环
     */
    gameLoop() {
        // 更新输入
        inputHandler.update();
        
        // 渲染游戏画面
        if ((this.state === 'playing' || this.state === 'ended') && renderer.canRender()) {
            renderer.render();
        }
        
        // 继续下一帧
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * 重置游戏状态
     */
    reset() {
        this.state = 'login';
        this.playerId = null;
        this.playerName = '';
        this.roomId = null;
        this.myRole = null;
        this.players = {};
        this.maze = null;
        this.revealCard = null;
        this.isHost = false;
        this.playerCount = 0;
        this.gameStartTime = null;
        this.stopTimer();
        inputHandler.disable();
    }
}

// 导出游戏实例
const game = new Game();

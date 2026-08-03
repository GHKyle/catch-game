/**
 * 渲染器类
 * 负责在Canvas上绘制游戏画面
 */
class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 30; // 每个格子的大小
        this.maze = null;
        this.players = {};
        this.myPlayerId = null;
        this.myRole = null;
        this.viewportX = 0;
        this.viewportY = 0;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.infoBarHeight = 48; // 顶部信息栏高度
        this.revealCard = null; // 显示卡位置
        this.chickenRevealed = false; // 小鸡是否被暴露
        this.revealPulse = 0; // 卡片闪烁动画
        
        // 颜色配置
        this.colors = {
            wall: '#2c3e50',
            path: '#ecf0f1',
            chicken: '#f1c40f',
            eagle: '#e74c3c',
            myPlayer: '#3498db',
            grid: '#bdc3c7'
        };
        
        this.init();
    }

    /**
     * 初始化渲染器
     */
    init() {
        // 延迟初始化，确保DOM已加载
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resize(), 100);
        });
        
        // 根据屏幕大小调整格子尺寸
        this.adjustCellSize();
        
        // 如果canvas已经在可见容器中，立即调整大小
        if (this.canvas.offsetParent !== null) {
            this.resize();
        }
    }

    /**
     * 根据屏幕大小调整格子尺寸
     */
    adjustCellSize() {
        const w = window.innerWidth;
        if (w <= 480) {
            this.cellSize = 18; // 小手机
        } else if (w <= 768) {
            this.cellSize = 22; // 大手机/小平板
        } else {
            this.cellSize = 30; // 桌面
        }
    }

    /**
     * 调整画布大小
     */
    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        this.adjustCellSize();
        
        // 获取容器尺寸，如果为0则使用窗口尺寸
        let width = container.clientWidth;
        let height = container.clientHeight;
        
        if (width <= 0) width = window.innerWidth;
        if (height <= 0) height = window.innerHeight;
        
        // 高度减去信息栏高度，让Canvas从信息栏下方开始
        height -= this.infoBarHeight;
        
        // 获取设备像素比，用于高清屏适配
        const dpr = window.devicePixelRatio || 1;
        
        // 只有当尺寸真正改变时才更新
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            // Canvas实际像素 = CSS像素 × DPI
            this.canvas.width = this.canvasWidth * dpr;
            this.canvas.height = this.canvasHeight * dpr;
            // CSS显示尺寸保持不变
            this.canvas.style.width = this.canvasWidth + 'px';
            this.canvas.style.height = this.canvasHeight + 'px';
            // Canvas顶部偏移信息栏高度
            this.canvas.style.marginTop = this.infoBarHeight + 'px';
            // 缩放绘图上下文以匹配DPI
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            console.log('Canvas resized to:', this.canvasWidth, 'x', this.canvasHeight, 'DPR:', dpr);
        }
    }
    
    /**
     * 强制重新调整画布大小
     */
    forceResize() {
        // 使用窗口尺寸作为默认值
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        // 尝试从容器获取尺寸
        const container = this.canvas.parentElement;
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
            width = container.clientWidth;
            height = container.clientHeight;
        }
        
        // 高度减去信息栏高度
        height -= this.infoBarHeight;
        
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // 获取设备像素比，用于高清屏适配
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvasWidth * dpr;
        this.canvas.height = this.canvasHeight * dpr;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
        this.canvas.style.marginTop = this.infoBarHeight + 'px';
        // 缩放绘图上下文以匹配DPI
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        console.log('Canvas force resized to:', this.canvasWidth, 'x', this.canvasHeight, 'DPR:', dpr);
    }

    /**
     * 设置迷宫数据
     */
    setMaze(mazeData) {
        this.maze = mazeData;
    }

    /**
     * 设置玩家数据
     */
    setPlayers(players) {
        this.players = players;
    }

    /**
     * 设置当前玩家ID和角色
     */
    setMyPlayer(playerId, role) {
        this.myPlayerId = playerId;
        this.myRole = role;
    }

    /**
     * 更新视口位置（跟随玩家）
     */
    updateViewport() {
        const myPlayer = this.players[this.myPlayerId];
        if (!myPlayer || !this.maze) return;

        // 计算玩家在画布上的位置
        const playerCanvasX = myPlayer.x * this.cellSize;
        const playerCanvasY = myPlayer.y * this.cellSize;

        // 计算视口偏移，使玩家居中
        this.viewportX = playerCanvasX - this.canvasWidth / 2;
        this.viewportY = playerCanvasY - this.canvasHeight / 2;

        // 限制视口范围
        const maxX = this.maze.width * this.cellSize - this.canvasWidth;
        const maxY = this.maze.height * this.cellSize - this.canvasHeight;

        this.viewportX = Math.max(0, Math.min(this.viewportX, maxX));
        this.viewportY = Math.max(0, Math.min(this.viewportY, maxY));
    }

    /**
     * 检查是否可以渲染
     */
    canRender() {
        return this.maze && this.players && this.canvasWidth > 0 && this.canvasHeight > 0;
    }

    /**
     * 渲染游戏画面
     */
    render() {
        // 如果没有数据，不渲染
        if (!this.maze || !this.players) return;
        
        // 如果canvas尺寸为0，尝试重新调整
        if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
            this.forceResize();
        }

        // 更新卡片闪烁动画
        this.revealPulse = (this.revealPulse + 0.05) % (Math.PI * 2);

        // 清空画布
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 更新视口
        this.updateViewport();

        // 绘制迷宫
        this.drawMaze();

        // 绘制显示卡
        this.drawRevealCard();

        // 绘制玩家
        this.drawPlayers();
    }

    /**
     * 绘制迷宫
     */
    drawMaze() {
        const grid = this.maze.grid;
        const startX = Math.floor(this.viewportX / this.cellSize);
        const startY = Math.floor(this.viewportY / this.cellSize);
        const endX = Math.ceil((this.viewportX + this.canvasWidth) / this.cellSize);
        const endY = Math.ceil((this.viewportY + this.canvasHeight) / this.cellSize);

        for (let y = startY; y < endY && y < this.maze.height; y++) {
            for (let x = startX; x < endX && x < this.maze.width; x++) {
                if (y < 0 || x < 0) continue;

                const canvasX = x * this.cellSize - this.viewportX;
                const canvasY = y * this.cellSize - this.viewportY;

                if (grid[y][x] === 1) {
                    // 墙壁
                    this.ctx.fillStyle = this.colors.wall;
                    this.ctx.fillRect(canvasX, canvasY, this.cellSize, this.cellSize);
                    
                    // 墙壁边框效果
                    this.ctx.strokeStyle = '#34495e';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(canvasX, canvasY, this.cellSize, this.cellSize);
                } else {
                    // 通道
                    this.ctx.fillStyle = this.colors.path;
                    this.ctx.fillRect(canvasX, canvasY, this.cellSize, this.cellSize);
                    
                    // 网格线
                    this.ctx.strokeStyle = this.colors.grid;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.strokeRect(canvasX, canvasY, this.cellSize, this.cellSize);
                }
            }
        }
    }

    /**
     * 绘制玩家
     */
    drawPlayers() {
        for (const playerId in this.players) {
            const player = this.players[playerId];
            
            // 老鹰视角：小鸡默认不可见，除非被显示卡暴露
            // 小鸡自己始终能看到自己
            const isMyself = (playerId === this.myPlayerId);
            if (this.myRole === 'eagle' && player.role === 'chicken' && !this.chickenRevealed && !isMyself) {
                continue;
            }

            this.drawPlayer(player, isMyself);
        }
    }

    /**
     * 设置显示卡位置
     */
    setRevealCard(card) {
        this.revealCard = card;
    }

    /**
     * 设置小鸡是否被暴露
     */
    setChickenRevealed(revealed) {
        this.chickenRevealed = revealed;
    }

    /**
     * 绘制显示卡
     */
    drawRevealCard() {
        if (!this.revealCard || !this.maze) return;

        const canvasX = this.revealCard.x * this.cellSize - this.viewportX;
        const canvasY = this.revealCard.y * this.cellSize - this.viewportY;

        // 检查是否在画布范围内
        if (canvasX < -this.cellSize || canvasX > this.canvasWidth + this.cellSize ||
            canvasY < -this.cellSize || canvasY > this.canvasHeight + this.cellSize) {
            return;
        }

        const centerX = canvasX + this.cellSize / 2;
        const centerY = canvasY + this.cellSize / 2;
        const size = this.cellSize * 0.35;

        // 绘制发光底圈
        const glowAlpha = 0.3 + Math.sin(this.revealPulse) * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, size + 4, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 180, 255, ${glowAlpha})`;
        this.ctx.fill();

        // 绘制卡片主体（菱形）
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = '#00b4ff';
        this.ctx.fillRect(-size / 2, -size / 2, size, size);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(-size / 2, -size / 2, size, size);
        this.ctx.restore();

        // 绘制眼睛图标
        this.ctx.fillStyle = '#fff';
        this.ctx.font = Math.max(8, Math.floor(this.cellSize * 0.4)) + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('👁', centerX, centerY);
    }

    /**
     * 绘制单个玩家
     */
    drawPlayer(player, isMe) {
        const canvasX = player.x * this.cellSize - this.viewportX;
        const canvasY = player.y * this.cellSize - this.viewportY;

        // 检查是否在画布范围内
        if (canvasX < -this.cellSize || canvasX > this.canvasWidth + this.cellSize ||
            canvasY < -this.cellSize || canvasY > this.canvasHeight + this.cellSize) {
            return;
        }

        const centerX = canvasX + this.cellSize / 2;
        const centerY = canvasY + this.cellSize / 2;
        const radius = this.cellSize * 0.42;

        // 绘制角色底光圈
        const glowColor = player.role === 'chicken'
            ? 'rgba(241, 196, 15, 0.35)'
            : 'rgba(231, 76, 60, 0.35)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        this.ctx.fillStyle = glowColor;
        this.ctx.fill();

        // 绘制玩家圆形背景
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        const bgGrad = this.ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
        if (player.role === 'chicken') {
            bgGrad.addColorStop(0, '#ffe066');
            bgGrad.addColorStop(1, '#f39c12');
        } else {
            bgGrad.addColorStop(0, '#ff6b6b');
            bgGrad.addColorStop(1, '#c0392b');
        }
        this.ctx.fillStyle = bgGrad;
        this.ctx.fill();

        // 自己的白色边框
        if (isMe) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = Math.max(2, this.cellSize / 8);
            this.ctx.stroke();
        }

        // 绘制方向指示器
        this.drawDirectionIndicator(centerX, centerY, radius, player.direction);

        // 绘制角色图标（emoji）
        const emojiSize = Math.max(10, Math.floor(this.cellSize * 0.55));
        this.ctx.font = emojiSize + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const emoji = player.role === 'chicken' ? '🐔' : '🦅';
        this.ctx.fillText(emoji, centerX, centerY + 1);

        // 绘制玩家名字（头顶）
        const nameFontSize = Math.max(7, Math.floor(this.cellSize * 0.3));
        this.ctx.fillStyle = '#fff';
        this.ctx.font = nameFontSize + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        // 名字背景
        const nameText = player.name;
        const nameWidth = this.ctx.measureText(nameText).width + 6;
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(centerX - nameWidth / 2, canvasY - nameFontSize - 6, nameWidth, nameFontSize + 4);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(nameText, centerX, canvasY - 3);

        // 绘制角色标识（底部小标签）
        const tagFontSize = Math.max(7, Math.floor(this.cellSize * 0.25));
        const roleLabel = player.role === 'chicken' ? '小鸡' : '老鹰';
        const tagColor = player.role === 'chicken' ? '#f39c12' : '#c0392b';
        const tagWidth = this.ctx.measureText(roleLabel).width + 8;
        this.ctx.font = tagFontSize + 'px Arial';
        this.ctx.fillStyle = tagColor;
        const tagX = centerX - tagWidth / 2;
        const tagY = canvasY + this.cellSize - 2;
        this.ctx.beginPath();
        this.ctx.roundRect(tagX, tagY, tagWidth, tagFontSize + 4, 3);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(roleLabel, centerX, tagY + 2);
    }

    /**
     * 绘制方向指示器
     */
    drawDirectionIndicator(x, y, radius, direction) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        let angle = 0;
        switch (direction) {
            case 'up': angle = -Math.PI / 2; break;
            case 'down': angle = Math.PI / 2; break;
            case 'left': angle = Math.PI; break;
            case 'right': angle = 0; break;
        }
        
        this.ctx.rotate(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(radius + 5, 0);
        this.ctx.lineTo(radius - 2, -4);
        this.ctx.lineTo(radius - 2, 4);
        this.ctx.closePath();
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        
        this.ctx.restore();
    }

    /**
     * 绘制游戏提示
     */
    drawHint(text) {
        const hintElement = document.getElementById('game-hint');
        if (hintElement) {
            hintElement.textContent = text;
            hintElement.classList.remove('hidden');
            
            setTimeout(() => {
                hintElement.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * 清除画布
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
}

// 导出渲染器实例
const renderer = new Renderer('game-canvas');

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

/**
 * 渲染器类 - 酷炫版
 * 高质量地图纹理、精致角色、粒子特效
 */
class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 30;
        this.maze = null;
        this.players = {};
        this.myPlayerId = null;
        this.myRole = null;
        this.viewportX = 0;
        this.viewportY = 0;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.infoBarHeight = 44;
        this.revealCard = null;
        this.chickenRevealed = false;
        this.revealPulse = 0;

        // 动画帧计数
        this.frameCount = 0;
        this.animTime = 0;

        // 粒子系统
        this.particles = [];
        this.trails = {};

        // 预渲染图案缓存
        this._patternCache = null;
        this._wallGradient = null;
        this._pathGradient = null;

        // 颜色配置
        this.colors = {
            wallDark: '#141428',
            wallMid: '#1c1c3a',
            wallLight: '#252545',
            wallAccent: '#6c5ce7',
            pathDark: '#1e1e38',
            pathMid: '#26264a',
            pathLight: '#2e2e55',
            pathAccent: 'rgba(108, 92, 231, 0.08)',
            chicken: '#ffd32a',
            chickenLight: '#ffe066',
            chickenDark: '#e6a800',
            eagle: '#ff4757',
            eagleLight: '#ff6b81',
            eagleDark: '#c0392b',
            myPlayer: '#6c5ce7'
        };

        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resize(), 150);
        });
        this.adjustCellSize();
        if (this.canvas.offsetParent !== null) {
            this.resize();
        }
    }

    adjustCellSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const minDim = Math.min(w, h);
        if (minDim <= 360) {
            this.cellSize = 16;
        } else if (minDim <= 480) {
            this.cellSize = 18;
        } else if (minDim <= 768) {
            this.cellSize = 22;
        } else {
            this.cellSize = 30;
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        this.adjustCellSize();

        let width = container.clientWidth;
        let height = container.clientHeight;
        if (width <= 0) width = window.innerWidth;
        if (height <= 0) height = window.innerHeight;
        height -= this.infoBarHeight;

        const dpr = window.devicePixelRatio || 1;

        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.canvas.width = this.canvasWidth * dpr;
            this.canvas.height = this.canvasHeight * dpr;
            this.canvas.style.width = this.canvasWidth + 'px';
            this.canvas.style.height = this.canvasHeight + 'px';
            this.canvas.style.marginTop = this.infoBarHeight + 'px';
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this._patternCache = null;
            this._wallGradient = null;
            this._pathGradient = null;
        }
    }

    forceResize() {
        let width = window.innerWidth;
        let height = window.innerHeight;
        const container = this.canvas.parentElement;
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
            width = container.clientWidth;
            height = container.clientHeight;
        }
        height -= this.infoBarHeight;
        this.adjustCellSize();
        this.canvasWidth = width;
        this.canvasHeight = height;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvasWidth * dpr;
        this.canvas.height = this.canvasHeight * dpr;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
        this.canvas.style.marginTop = this.infoBarHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._patternCache = null;
    }

    setMaze(mazeData) {
        this.maze = mazeData;
        this._patternCache = null;
    }

    setPlayers(players) {
        this.players = players;
    }

    setMyPlayer(playerId, role) {
        this.myPlayerId = playerId;
        this.myRole = role;
    }

    setRevealCard(card) {
        this.revealCard = card;
    }

    setChickenRevealed(revealed) {
        this.chickenRevealed = revealed;
    }

    updateViewport() {
        const myPlayer = this.players[this.myPlayerId];
        if (!myPlayer || !this.maze) return;

        const playerCanvasX = myPlayer.x * this.cellSize;
        const playerCanvasY = myPlayer.y * this.cellSize;
        this.viewportX = playerCanvasX - this.canvasWidth / 2;
        this.viewportY = playerCanvasY - this.canvasHeight / 2;

        const maxX = this.maze.width * this.cellSize - this.canvasWidth;
        const maxY = this.maze.height * this.cellSize - this.canvasHeight;
        this.viewportX = Math.max(0, Math.min(this.viewportX, maxX));
        this.viewportY = Math.max(0, Math.min(this.viewportY, maxY));
    }

    canRender() {
        return this.maze && this.players && this.canvasWidth > 0 && this.canvasHeight > 0;
    }

    /**
     * 主渲染循环
     */
    render() {
        if (!this.maze || !this.players) return;
        if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
            this.forceResize();
        }

        this.frameCount++;
        this.animTime = this.frameCount * 0.02;
        this.revealPulse = (this.revealPulse + 0.04) % (Math.PI * 2);

        const ctx = this.ctx;
        ctx.save();

        // 背景
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.updateViewport();
        ctx.save();
        ctx.translate(-this.viewportX, -this.viewportY);

        this.drawMaze();
        this.drawRevealCard();
        this.updateParticles();
        this.drawParticles();
        this.drawPlayers();

        ctx.restore();

        // 迷雾边缘
        this.drawVignette();

        ctx.restore();
    }

    /**
     * 绘制迷宫 - 带纹理
     */
    drawMaze() {
        const grid = this.maze.grid;
        const cs = this.cellSize;
        const w = this.maze.width;
        const h = this.maze.height;
        const startX = Math.floor(this.viewportX / cs) - 1;
        const startY = Math.floor(this.viewportY / cs) - 1;
        const endX = Math.ceil((this.viewportX + this.canvasWidth) / cs) + 1;
        const endY = Math.ceil((this.viewportY + this.canvasHeight) / cs) + 1;

        const ctx = this.ctx;

        for (let y = startY; y < endY && y < h; y++) {
            for (let x = startX; x < endX && x < w; x++) {
                if (y < 0 || x < 0) continue;
                const cx = x * cs;
                const cy = y * cs;

                if (grid[y][x] === 1) {
                    this.drawWallCell(cx, cy, x, y);
                } else {
                    // 获取四邻居：上下左右是否为通道
                    const neighbors = {
                        up:    (y > 0     && grid[y - 1][x] === 0),
                        down:  (y < h - 1 && grid[y + 1][x] === 0),
                        left:  (x > 0     && grid[y][x - 1] === 0),
                        right: (x < w - 1 && grid[y][x + 1] === 0)
                    };
                    this.drawPathCell(cx, cy, x, y, neighbors);
                }
            }
        }
    }

    /**
     * 绘制墙壁格子
     */
    drawWallCell(cx, cy, gx, gy) {
        const ctx = this.ctx;
        const cs = this.cellSize;

        // 基础墙壁颜色 - 有微妙的随机变化
        const hash = ((gx * 7919 + gy * 104729) % 255) / 255;
        const r = Math.floor(20 + hash * 12);
        const g = Math.floor(20 + hash * 10);
        const b = Math.floor(40 + hash * 20);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(cx, cy, cs, cs);

        // 墙壁顶部高光
        const topGrad = ctx.createLinearGradient(cx, cy, cx, cy + cs * 0.4);
        topGrad.addColorStop(0, 'rgba(108, 92, 231, 0.12)');
        topGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = topGrad;
        ctx.fillRect(cx, cy, cs, cs * 0.4);

        // 墙壁内边线 - 模拟3D凸起
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);

        // 墙壁暗边
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + cs, cy);
        ctx.lineTo(cx + cs, cy + cs);
        ctx.lineTo(cx, cy + cs);
        ctx.stroke();

        // 微小装饰纹理点
        if ((gx + gy) % 5 === 0) {
            ctx.fillStyle = 'rgba(108, 92, 231, 0.06)';
            const dotSize = cs * 0.15;
            ctx.fillRect(cx + cs / 2 - dotSize / 2, cy + cs / 2 - dotSize / 2, dotSize, dotSize);
        }
    }

    /**
     * 绘制通道格子 - 智能边框，相邻通道之间无边线
     */
    drawPathCell(cx, cy, gx, gy, neighbors) {
        const ctx = this.ctx;
        const cs = this.cellSize;

        // 通道基础色 - 明显提亮
        const hash = ((gx * 3571 + gy * 7907) % 255) / 255;
        const r = Math.floor(55 + hash * 15);
        const g = Math.floor(52 + hash * 12);
        const b = Math.floor(80 + hash * 18);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(cx, cy, cs, cs);

        // 地板细微纹理 - 交叉线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cs, cy + cs);
        ctx.moveTo(cx + cs, cy);
        ctx.lineTo(cx, cy + cs);
        ctx.stroke();

        // 只在面朝墙壁的一侧画边框，面朝通道的一侧不画
        const borderColor = 'rgba(100, 90, 200, 0.2)';
        const wallSideColor = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;

        // 上方是墙壁 -> 画上边暗线
        if (!neighbors.up) {
            ctx.strokeStyle = wallSideColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 0.5);
            ctx.lineTo(cx + cs, cy + 0.5);
            ctx.stroke();
        } else {
            // 与上方通道衔接 - 淡淡的过渡线
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 0.5);
            ctx.lineTo(cx + cs, cy + 0.5);
            ctx.stroke();
        }

        // 下方
        if (!neighbors.down) {
            ctx.strokeStyle = wallSideColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy + cs - 0.5);
            ctx.lineTo(cx + cs, cy + cs - 0.5);
            ctx.stroke();
        } else {
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy + cs - 0.5);
            ctx.lineTo(cx + cs, cy + cs - 0.5);
            ctx.stroke();
        }

        // 左方
        if (!neighbors.left) {
            ctx.strokeStyle = wallSideColor;
            ctx.beginPath();
            ctx.moveTo(cx + 0.5, cy);
            ctx.lineTo(cx + 0.5, cy + cs);
            ctx.stroke();
        } else {
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.moveTo(cx + 0.5, cy);
            ctx.lineTo(cx + 0.5, cy + cs);
            ctx.stroke();
        }

        // 右方
        if (!neighbors.right) {
            ctx.strokeStyle = wallSideColor;
            ctx.beginPath();
            ctx.moveTo(cx + cs - 0.5, cy);
            ctx.lineTo(cx + cs - 0.5, cy + cs);
            ctx.stroke();
        } else {
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.moveTo(cx + cs - 0.5, cy);
            ctx.lineTo(cx + cs - 0.5, cy + cs);
            ctx.stroke();
        }

        // 呼吸光效
        const breathAlpha = 0.04 + Math.sin(this.animTime + gx * 0.3 + gy * 0.7) * 0.025;
        ctx.fillStyle = `rgba(108, 92, 231, ${breathAlpha})`;
        ctx.fillRect(cx, cy, cs, cs);
    }

    /**
     * 绘制玩家
     */
    drawPlayers() {
        const sortedPlayers = Object.entries(this.players).map(([id, p]) => ({ id, ...p }));
        // 按 y 排序，让上方玩家先绘制（有层级感）
        sortedPlayers.sort((a, b) => a.y - b.y);

        for (const player of sortedPlayers) {
            const isMyself = (player.id === this.myPlayerId);
            if (this.myRole === 'eagle' && player.role === 'chicken' && !this.chickenRevealed && !isMyself) {
                continue;
            }
            this.drawPlayer(player, isMyself);
        }
    }

    /**
     * 绘制单个玩家 - 酷炫版
     */
    drawPlayer(player, isMe) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const cx = player.x * cs + cs / 2;
        const cy = player.y * cs + cs / 2;
        const radius = cs * 0.38;
        const isChicken = player.role === 'chicken';

        // 超出视口检查
        if (cx - cs < this.viewportX - cs || cx + cs > this.viewportX + this.canvasWidth + cs ||
            cy - cs < this.viewportY - cs || cy + cs > this.viewportY + this.canvasHeight + cs) {
            return;
        }

        // 生成尾焰粒子
        if (this.frameCount % 3 === 0) {
            this.addTrailParticle(cx, cy, isChicken);
        }

        ctx.save();

        // === 外层发光 ===
        const glowColor = isChicken ? 'rgba(255, 211, 42,' : 'rgba(255, 71, 87,';
        const glowPulse = 0.2 + Math.sin(this.animTime * 2 + player.x + player.y) * 0.08;
        const glowRadius = radius * 1.8;
        const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, glowRadius);
        glowGrad.addColorStop(0, glowColor + (glowPulse * 0.6) + ')');
        glowGrad.addColorStop(0.5, glowColor + (glowPulse * 0.2) + ')');
        glowGrad.addColorStop(1, glowColor + '0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // === 角色身体 - 渐变球体 ===
        ctx.shadowColor = isChicken ? this.colors.chicken : this.colors.eagle;
        ctx.shadowBlur = 15;

        const bodyGrad = ctx.createRadialGradient(
            cx - radius * 0.25, cy - radius * 0.25, 0,
            cx, cy, radius
        );
        if (isChicken) {
            bodyGrad.addColorStop(0, '#fff3a3');
            bodyGrad.addColorStop(0.3, this.colors.chickenLight);
            bodyGrad.addColorStop(0.7, this.colors.chicken);
            bodyGrad.addColorStop(1, this.colors.chickenDark);
        } else {
            bodyGrad.addColorStop(0, '#ffb3b3');
            bodyGrad.addColorStop(0.3, this.colors.eagleLight);
            bodyGrad.addColorStop(0.7, this.colors.eagle);
            bodyGrad.addColorStop(1, this.colors.eagleDark);
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 边缘环
        ctx.strokeStyle = isChicken ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // === 高光反射 ===
        const hlGrad = ctx.createRadialGradient(
            cx - radius * 0.2, cy - radius * 0.3, 0,
            cx - radius * 0.2, cy - radius * 0.3, radius * 0.5
        );
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // === 自己的白色光环 ===
        if (isMe) {
            const ringPulse = 0.5 + Math.sin(this.animTime * 3) * 0.2;
            ctx.strokeStyle = `rgba(255, 255, 255, ${ringPulse})`;
            ctx.lineWidth = Math.max(2, cs / 7);
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // === 方向指示器 ===
        this.drawDirectionIndicator(cx, cy, radius, player.direction, isChicken);

        // === 角色表情 ===
        this.drawFace(cx, cy, radius, isChicken, isMe);

        // === 名字+角色 合并标签（显示在上方） ===
        this.drawNameTag(player.name, cx, cy, radius, cs, isChicken);

        ctx.restore();
    }

    /**
     * 绘制角色表情
     */
    drawFace(cx, cy, radius, isChicken, isMe) {
        const ctx = this.ctx;
        const s = radius * 0.35;

        if (isChicken) {
            // 小鸡：圆眼睛 + 小嘴巴
            // 眼睛
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(cx - s * 0.45, cy - s * 0.15, s * 0.18, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.45, cy - s * 0.15, s * 0.18, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛高光
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - s * 0.38, cy - s * 0.22, s * 0.07, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.52, cy - s * 0.22, s * 0.07, 0, Math.PI * 2);
            ctx.fill();

            // 嘴巴（小三角）
            ctx.fillStyle = '#e67e22';
            ctx.beginPath();
            ctx.moveTo(cx, cy + s * 0.05);
            ctx.lineTo(cx - s * 0.15, cy + s * 0.25);
            ctx.lineTo(cx + s * 0.15, cy + s * 0.25);
            ctx.closePath();
            ctx.fill();

            // 腮红
            ctx.fillStyle = 'rgba(255, 150, 150, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - s * 0.55, cy + s * 0.15, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + s * 0.55, cy + s * 0.15, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();

            // 头顶小鸡冠
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.08, cy - radius * 0.65);
            ctx.lineTo(cx, cy - radius * 0.85);
            ctx.lineTo(cx + s * 0.08, cy - radius * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + s * 0.12, cy - radius * 0.6);
            ctx.lineTo(cx + s * 0.22, cy - radius * 0.78);
            ctx.lineTo(cx + s * 0.28, cy - radius * 0.58);
            ctx.closePath();
            ctx.fill();
        } else {
            // 老鹰：锐利眼神 + 钩嘴
            // 眼睛（带棱角）
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cx - s * 0.42, cy - s * 0.1, s * 0.2, s * 0.14, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + s * 0.42, cy - s * 0.1, s * 0.2, s * 0.14, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // 瞳孔
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(cx - s * 0.38, cy - s * 0.08, s * 0.1, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.38, cy - s * 0.08, s * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // 愤怒眉
            ctx.strokeStyle = '#333';
            ctx.lineWidth = s * 0.08;
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.6, cy - s * 0.3);
            ctx.lineTo(cx - s * 0.2, cy - s * 0.22);
            ctx.moveTo(cx + s * 0.6, cy - s * 0.3);
            ctx.lineTo(cx + s * 0.2, cy - s * 0.22);
            ctx.stroke();

            // 钩嘴
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.moveTo(cx, cy + s * 0.0);
            ctx.lineTo(cx - s * 0.12, cy + s * 0.18);
            ctx.quadraticCurveTo(cx, cy + s * 0.35, cx + s * 0.06, cy + s * 0.22);
            ctx.lineTo(cx, cy + s * 0.0);
            ctx.fill();
        }
    }

    /**
     * 绘制方向指示器
     */
    drawDirectionIndicator(x, y, radius, direction, isChicken) {
        if (!direction) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);

        let angle = 0;
        switch (direction) {
            case 'up': angle = -Math.PI / 2; break;
            case 'down': angle = Math.PI / 2; break;
            case 'left': angle = Math.PI; break;
            case 'right': angle = 0; break;
        }
        ctx.rotate(angle);

        const len = radius + 5;
        const color = isChicken ? this.colors.chicken : this.colors.eagle;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(len + 2, 0);
        ctx.lineTo(radius - 1, -3.5);
        ctx.lineTo(radius - 1, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /**
     * 绘制名字+角色标签（合并显示在上方）
     */
    drawNameTag(name, cx, cy, radius, cs, isChicken) {
        const ctx = this.ctx;
        const roleLabel = isChicken ? '小鸡' : '老鹰';
        const displayName = name + ' [' + roleLabel + ']';

        const fontSize = Math.max(8, Math.floor(cs * 0.28));
        ctx.font = `600 ${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const textW = ctx.measureText(displayName).width;
        const padX = 8;
        const padY = 3;
        const tagW = textW + padX * 2;
        const tagH = fontSize + padY * 2;
        const tagX = cx - tagW / 2;
        const tagY = cy - radius - tagH - 6;

        // 标签背景
        ctx.fillStyle = 'rgba(10, 10, 26, 0.78)';
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 6);
        ctx.fill();

        // 标签边框
        const borderColor = isChicken ? 'rgba(255, 211, 42, 0.35)' : 'rgba(255, 71, 87, 0.35)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 名字部分（白色）
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        const nameW = ctx.measureText(name).width;
        const roleText = ' [' + roleLabel + ']';
        const roleW = ctx.measureText(roleText).width;
        const totalW = nameW + roleW;
        const startX = cx - totalW / 2;

        // 画名字
        ctx.textAlign = 'left';
        ctx.fillText(name, startX, tagY + tagH / 2);

        // 画角色（带颜色）
        ctx.fillStyle = isChicken ? '#ffd32a' : '#ff6b81';
        ctx.fillText(roleText, startX + nameW, tagY + tagH / 2);
    }

    /**
     * 绘制角色底部标签
     */
    drawRoleTag(isChicken, cx, cy, radius, cs) {
        const ctx = this.ctx;
        const tagFontSize = Math.max(7, Math.floor(cs * 0.22));
        const roleLabel = isChicken ? '小鸡' : '老鹰';
        const tagColor = isChicken ? 'rgba(255, 211, 42, 0.85)' : 'rgba(255, 71, 87, 0.85)';
        const bgColor = isChicken ? 'rgba(255, 211, 42, 0.15)' : 'rgba(255, 71, 87, 0.15)';

        ctx.font = `600 ${tagFontSize}px -apple-system, sans-serif`;
        const tagW = ctx.measureText(roleLabel).width + 10;
        const tagH = tagFontSize + 5;
        const tagX = cx - tagW / 2;
        const tagY = cy + radius + 3;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 4);
        ctx.fill();

        ctx.strokeStyle = tagColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = tagColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(roleLabel, cx, tagY + 2.5);
    }

    /**
     * 绘制显示卡
     */
    drawRevealCard() {
        if (!this.revealCard || !this.maze) return;
        const ctx = this.ctx;
        const cs = this.cellSize;
        const cx = this.revealCard.x * cs + cs / 2;
        const cy = this.revealCard.y * cs + cs / 2;

        if (cx < this.viewportX - cs * 2 || cx > this.viewportX + this.canvasWidth + cs * 2 ||
            cy < this.viewportY - cs * 2 || cy > this.viewportY + this.canvasHeight + cs * 2) {
            return;
        }

        const size = cs * 0.35;
        const pulse = Math.sin(this.revealPulse);

        // 外层光圈
        const glowAlpha = 0.15 + pulse * 0.1;
        const glowGrad = ctx.createRadialGradient(cx, cy, size, cx, cy, size * 3);
        glowGrad.addColorStop(0, `rgba(0, 180, 255, ${glowAlpha})`);
        glowGrad.addColorStop(1, 'rgba(0, 180, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // 旋转菱形
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4 + this.animTime * 0.5);

        ctx.shadowColor = '#00b4ff';
        ctx.shadowBlur = 12;

        const cardGrad = ctx.createLinearGradient(-size, -size, size, size);
        cardGrad.addColorStop(0, '#00d4ff');
        cardGrad.addColorStop(1, '#0088cc');
        ctx.fillStyle = cardGrad;
        ctx.fillRect(-size / 2, -size / 2, size, size);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        ctx.shadowBlur = 0;
        ctx.restore();

        // 眼睛图标
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(10, Math.floor(cs * 0.45))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👁', cx, cy);
    }

    // ============================================
    //  粒子系统
    // ============================================

    addTrailParticle(x, y, isChicken) {
        if (this.particles.length > 120) return;
        const color = isChicken ? this.colors.chicken : this.colors.eagle;
        this.particles.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            size: 1 + Math.random() * 2.5,
            color: color
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = p.life * 0.6;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * 迷雾边缘效果
     */
    drawVignette() {
        const ctx = this.ctx;
        const w = this.canvasWidth;
        const h = this.canvasHeight;

        // 四周暗角
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, 'rgba(10, 10, 26, 0)');
        grad.addColorStop(1, 'rgba(10, 10, 26, 0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
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

    clear() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
}

const renderer = new Renderer('game-canvas');

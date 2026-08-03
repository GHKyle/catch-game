/**
 * 输入处理类
 * 处理键盘和移动端输入
 */
class InputHandler {
    constructor() {
        this.keys = {};
        this.lastMoveTime = 0;
        this.moveInterval = 150; // 移动间隔（毫秒）
        this.enabled = false;
        this.callbacks = {};
        this.isMobile = this.checkMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30; // 滑动触发阈值
        this.dpadInterval = null; // 长按连续移动定时器
        this.dpadDirection = null; // 当前按住的方向
    }

    /**
     * 检测是否为移动设备
     */
    checkMobile() {
        // 同时检测 UA 和触摸能力
        const ua = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        return ua || (touch && window.innerWidth <= 1024);
    }

    /**
     * 初始化输入处理
     */
    init() {
        this.setupKeyboard();
        if (this.isMobile) {
            this.setupMobileControls();
        }
        this.setupSwipeControls();
    }

    /**
     * 设置键盘监听
     */
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            this.keys[e.key] = true;

            // 阻止默认行为（防止页面滚动）
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    /**
     * 设置移动端控制
     */
    setupMobileControls() {
        const directions = {
            'btn-up': 'up',
            'btn-down': 'down',
            'btn-left': 'left',
            'btn-right': 'right'
        };

        Object.keys(directions).forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const dir = directions[id];

            // touchstart: 立即移动 + 启动长按连续移动
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.enabled) return;
                this.dpadDirection = dir;
                this.triggerMove(dir);
                this.startDpadHold();
            }, { passive: false });

            // touchend / touchcancel: 停止长按
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopDpadHold();
            });

            btn.addEventListener('touchcancel', () => {
                this.stopDpadHold();
            });
        });
    }

    /**
     * 启动长按连续移动
     */
    startDpadHold() {
        this.stopDpadHold();
        this.dpadInterval = setInterval(() => {
            if (!this.enabled || !this.dpadDirection) {
                this.stopDpadHold();
                return;
            }
            this.triggerMove(this.dpadDirection);
        }, this.moveInterval);
    }

    /**
     * 停止长按连续移动
     */
    stopDpadHold() {
        if (this.dpadInterval) {
            clearInterval(this.dpadInterval);
            this.dpadInterval = null;
        }
        this.dpadDirection = null;
    }

    /**
     * 设置滑动手势控制（在Canvas上滑动控制方向）
     */
    setupSwipeControls() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.enabled) return;
            e.preventDefault(); // 防止页面滚动
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (!this.enabled) return;
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;

            if (Math.abs(dx) < this.swipeThreshold && Math.abs(dy) < this.swipeThreshold) {
                return; // 滑动距离太小，忽略
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                this.triggerMove(dx > 0 ? 'right' : 'left');
            } else {
                this.triggerMove(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });
    }

    /**
     * 启用输入
     */
    enable() {
        this.enabled = true;
        // 移动端启用时显示虚拟按键
        if (this.isMobile) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.classList.remove('hidden');
        }
    }

    /**
     * 禁用输入
     */
    disable() {
        this.enabled = false;
        this.keys = {};
        this.stopDpadHold();
    }

    /**
     * 更新输入状态（每帧调用）
     */
    update() {
        if (!this.enabled) return;

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveInterval) {
            return;
        }

        let direction = null;

        // 检查键盘输入
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            direction = 'up';
        } else if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            direction = 'down';
        } else if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            direction = 'left';
        } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            direction = 'right';
        }

        if (direction) {
            this.triggerMove(direction);
        }
    }

    /**
     * 触发移动
     */
    triggerMove(direction) {
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveInterval) {
            return;
        }

        this.lastMoveTime = now;
        this.trigger('move', direction);
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
}

// 导出输入处理实例
const inputHandler = new InputHandler();

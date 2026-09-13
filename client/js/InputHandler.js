/**
 * 输入处理类 - 增强版
 * 优化移动端触控、滑动反馈、连续移动
 */
class InputHandler {
    constructor() {
        this.keys = {};
        this.lastMoveTime = 0;
        this.moveInterval = 130;
        this.enabled = false;
        this.callbacks = {};
        this.isMobile = this.checkMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 25;
        this.dpadInterval = null;
        this.dpadDirection = null;
    }

    checkMobile() {
        const ua = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        return ua || (touch && window.innerWidth <= 1024);
    }

    init() {
        this.setupKeyboard();
        if (this.isMobile) {
            this.setupMobileControls();
        }
        this.setupSwipeControls();
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            this.keys[e.key] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

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

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.enabled) return;
                this.dpadDirection = dir;
                this.triggerMove(dir);
                this.startDpadHold();
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.stopDpadHold();
            });

            btn.addEventListener('touchcancel', (e) => {
                e.stopPropagation();
                this.stopDpadHold();
            });
        });

        // 防止双指缩放
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
    }

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

    stopDpadHold() {
        if (this.dpadInterval) {
            clearInterval(this.dpadInterval);
            this.dpadInterval = null;
        }
        this.dpadDirection = null;
    }

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
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (!this.enabled) return;
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;

            if (Math.abs(dx) < this.swipeThreshold && Math.abs(dy) < this.swipeThreshold) {
                return;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                this.triggerMove(dx > 0 ? 'right' : 'left');
            } else {
                this.triggerMove(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });
    }

    enable() {
        this.enabled = true;
        if (this.isMobile) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.classList.remove('hidden');
                mobileControls.classList.add('visible');
            }
        }
    }

    disable() {
        this.enabled = false;
        this.keys = {};
        this.stopDpadHold();
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.classList.add('hidden');
            mobileControls.classList.remove('visible');
        }
    }

    update() {
        if (!this.enabled) return;

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveInterval) {
            return;
        }

        let direction = null;

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

    triggerMove(direction) {
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveInterval) {
            return;
        }
        this.lastMoveTime = now;
        this.trigger('move', direction);
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
}

const inputHandler = new InputHandler();

/**
 * 工具函数
 * 提供通用的辅助功能
 */

/**
 * 生成随机ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * 格式化时间
 */
function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 计算两点之间的距离
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 检查点是否在矩形区域内
 */
function isPointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * 随机整数
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点数
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 限制值在范围内
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 线性插值
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 导出工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateId,
        formatTime,
        distance,
        isPointInRect,
        randomInt,
        randomFloat,
        clamp,
        lerp,
        debounce,
        throttle
    };
}

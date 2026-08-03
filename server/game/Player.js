/**
 * 玩家类
 * 管理玩家的状态、位置和角色
 */
class Player {
    constructor(id, name = '玩家') {
        this.id = id;
        this.name = name;
        this.role = null; // 'chicken' 或 'eagle'
        this.x = 0;
        this.y = 0;
        this.isMoving = false;
        this.direction = 'down'; // up, down, left, right
        this.speed = 1; // 移动速度（格子数）
        this.canMove = false; // 是否可以移动
    }

    /**
     * 获取玩家名字
     */
    getName() {
        return this.name;
    }

    /**
     * 设置玩家角色
     */
    setRole(role) {
        this.role = role;
    }

    /**
     * 设置玩家位置
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * 设置玩家是否可以移动
     */
    setCanMove(canMove) {
        this.canMove = canMove;
    }

    /**
     * 尝试移动玩家
     * @param {string} direction - 移动方向 (up, down, left, right)
     * @param {object} maze - 迷宫对象
     * @returns {boolean} 是否移动成功
     */
    move(direction, maze) {
        if (!this.canMove) {
            return false;
        }

        this.direction = direction;

        let newX = this.x;
        let newY = this.y;

        switch (direction) {
            case 'up':
                newY -= this.speed;
                break;
            case 'down':
                newY += this.speed;
                break;
            case 'left':
                newX -= this.speed;
                break;
            case 'right':
                newX += this.speed;
                break;
            default:
                return false;
        }

        // 检查新位置是否可通行
        if (maze.isWalkable(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.isMoving = true;
            return true;
        }

        return false;
    }

    /**
     * 检查是否与其他玩家碰撞
     */
    checkCollision(otherPlayer) {
        return this.x === otherPlayer.x && this.y === otherPlayer.y;
    }

    /**
     * 获取玩家状态
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            x: this.x,
            y: this.y,
            direction: this.direction,
            isMoving: this.isMoving,
            canMove: this.canMove
        };
    }

    /**
     * 获取玩家ID
     */
    getId() {
        return this.id;
    }

    /**
     * 获取玩家角色
     */
    getRole() {
        return this.role;
    }

    /**
     * 获取玩家位置
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * 重置玩家状态
     */
    reset() {
        this.role = null;
        this.x = 0;
        this.y = 0;
        this.isMoving = false;
        this.direction = 'down';
        this.canMove = false;
    }
}

module.exports = Player;

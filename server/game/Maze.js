/**
 * 迷宫生成类
 * 使用深度优先搜索（DFS）算法生成随机迷宫
 */
class Maze {
    constructor(width = 20, height = 20) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.generate();
    }

    /**
     * 生成迷宫
     */
    generate() {
        // 初始化网格，全部设为墙壁
        this.grid = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => 1)
        );

        // 从(1,1)开始生成迷宫
        this.dfs(1, 1);

        // 确保起点和终点是通道
        this.grid[1][1] = 0;
        this.grid[this.height - 2][this.width - 2] = 0;

        // 添加一些额外的通道，使迷宫不那么死板
        this.addExtraPaths();
    }

    /**
     * 深度优先搜索生成迷宫
     */
    dfs(x, y) {
        this.grid[y][x] = 0;

        // 定义四个方向：上、右、下、左
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];

        // 随机打乱方向
        this.shuffleArray(directions);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            // 检查边界
            if (nx >= 1 && nx < this.width - 1 && ny >= 1 && ny < this.height - 1) {
                // 如果目标位置是墙壁
                if (this.grid[ny][nx] === 1) {
                    // 打通中间的墙
                    this.grid[y + dy / 2][x + dx / 2] = 0;
                    this.dfs(nx, ny);
                }
            }
        }
    }

    /**
     * 添加额外的路径，使迷宫更通达
     * 策略：先BFS标记所有可达格子，然后优先打通隔离区域
     */
    addExtraPaths() {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        // 第一步：BFS从(1,1)标记所有可达格子
        const reachable = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => false)
        );
        const queue = [[1, 1]];
        reachable[1][1] = true;
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            for (const [dx, dy] of dirs) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 1 && nx < this.width - 1 && ny >= 1 && ny < this.height - 1
                    && !reachable[ny][nx] && this.grid[ny][nx] === 0) {
                    reachable[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }

        // 第二步：打通隔离区域的墙壁
        const bridgeWalls = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] !== 1) continue;
                const hasReachableNeighbor = (
                    (x > 0 && reachable[y][x - 1]) ||
                    (x < this.width - 1 && reachable[y][x + 1]) ||
                    (y > 0 && reachable[y - 1][x]) ||
                    (y < this.height - 1 && reachable[y + 1][x])
                );
                const hasUnreachableWalkable = (
                    (x > 0 && !reachable[y][x - 1] && this.grid[y][x - 1] === 0) ||
                    (x < this.width - 1 && !reachable[y][x + 1] && this.grid[y][x + 1] === 0) ||
                    (y > 0 && !reachable[y - 1][x] && this.grid[y - 1][x] === 0) ||
                    (y < this.height - 1 && !reachable[y + 1][x] && this.grid[y + 1][x] === 0)
                );
                if (hasReachableNeighbor && hasUnreachableWalkable) {
                    bridgeWalls.push([x, y]);
                }
            }
        }
        this.shuffleArray(bridgeWalls);
        for (const [bx, by] of bridgeWalls) {
            this.grid[by][bx] = 0;
        }

        // 第三步：消除死胡同（核心优化）
        // 死胡同 = 只有1个方向可走的通道，打通旁边的墙消除它
        for (let round = 0; round < 3; round++) {
            const deadEnds = [];
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    if (this.grid[y][x] !== 0) continue;
                    let walkableCount = 0;
                    for (const [dx, dy] of dirs) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] === 0) {
                            walkableCount++;
                        }
                    }
                    if (walkableCount === 1) {
                        deadEnds.push([x, y]);
                    }
                }
            }
            this.shuffleArray(deadEnds);
            for (const [ex, ey] of deadEnds) {
                for (const [dx, dy] of dirs) {
                    const wx = ex + dx;
                    const wy = ey + dy;
                    if (wx >= 1 && wx < this.width - 1 && wy >= 1 && wy < this.height - 1 && this.grid[wy][wx] === 1) {
                        const oppositeX = wx + dx;
                        const oppositeY = wy + dy;
                        if (oppositeX >= 0 && oppositeX < this.width && oppositeY >= 0 && oppositeY < this.height && this.grid[oppositeY][oppositeX] === 0) {
                            this.grid[wy][wx] = 0;
                            break;
                        }
                    }
                }
            }
        }

        // 第四步：额外随机移除墙壁，大幅增加路径（从3%提高到12%）
        const extraPaths = Math.floor(this.width * this.height * 0.12);
        for (let i = 0; i < extraPaths; i++) {
            const x = Math.floor(Math.random() * (this.width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - 2)) + 1;
            if (this.grid[y][x] === 1) {
                // 确保旁边有通道
                let hasAdjacentPath = false;
                for (const [dx, dy] of dirs) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] === 0) {
                        hasAdjacentPath = true;
                        break;
                    }
                }
                if (hasAdjacentPath) {
                    this.grid[y][x] = 0;
                }
            }
        }
    }

    /**
     * 打乱数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * 获取迷宫数据
     */
    getGrid() {
        return this.grid;
    }

    /**
     * 检查位置是否可通行
     */
    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.grid[y][x] === 0;
    }

    /**
     * 获取随机可通行位置
     */
    getRandomWalkablePosition() {
        let x, y;
        do {
            x = Math.floor(Math.random() * (this.width - 2)) + 1;
            y = Math.floor(Math.random() * (this.height - 2)) + 1;
        } while (!this.isWalkable(x, y));
        return { x, y };
    }

    /**
     * 获取迷宫尺寸
     */
    getSize() {
        return {
            width: this.width,
            height: this.height
        };
    }

    /**
     * 序列化迷宫数据（用于网络传输）
     */
    serialize() {
        return {
            width: this.width,
            height: this.height,
            grid: this.grid
        };
    }
}

module.exports = Maze;

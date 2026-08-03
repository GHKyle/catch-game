/**
 * 前端入口文件
 * 初始化游戏并启动
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('小鸡快跑 - 游戏初始化中...');
    
    // 初始化游戏
    game.init();
    
    console.log('游戏初始化完成！');
});

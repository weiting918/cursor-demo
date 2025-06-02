class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameContainer = document.querySelector('.grid-container');
        this.scoreDisplay = document.getElementById('score');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.soundEffects = new SoundEffects();
        this.init();
        this.setupDragControl();
    }

    setupDragControl() {
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        const minDistance = 50; // 最小拖动距离，用于判断是否触发移动

        const handleDragStart = (e) => {
            if (e.type === 'mousedown') {
                startX = e.clientX;
                startY = e.clientY;
            } else if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
            isDragging = true;
        };

        const handleDragEnd = (e) => {
            if (!isDragging) return;
            
            let endX, endY;
            if (e.type === 'mouseup') {
                endX = e.clientX;
                endY = e.clientY;
            } else if (e.type === 'touchend') {
                endX = e.changedTouches[0].clientX;
                endY = e.changedTouches[0].clientY;
            }

            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (Math.max(absDeltaX, absDeltaY) >= minDistance) {
                if (absDeltaX > absDeltaY) {
                    // 水平移动
                    if (deltaX > 0) {
                        this.move('right');
                    } else {
                        this.move('left');
                    }
                } else {
                    // 垂直移动
                    if (deltaY > 0) {
                        this.move('down');
                    } else {
                        this.move('up');
                    }
                }
            }

            isDragging = false;
        };

        const handleDragMove = (e) => {
            if (isDragging) {
                e.preventDefault(); // 防止页面滚动
            }
        };

        // 添加鼠标事件监听
        this.gameContainer.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);

        // 添加触摸事件监听（移动设备支持）
        this.gameContainer.addEventListener('touchstart', handleDragStart);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    }

    init() {
        // Clear the grid
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.updateScore();
        
        // Create grid cells
        this.gameContainer.innerHTML = '';
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            this.gameContainer.appendChild(cell);
        }

        // Add initial tiles
        this.addNewTile();
        this.addNewTile();
        this.updateGrid();
    }

    addNewTile() {
        const emptyCells = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({x: i, y: j});
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    updateGrid() {
        // Remove existing tiles
        const existingTiles = document.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        // Calculate tile size
        const containerWidth = 450;
        const gap = 15;
        const tileSize = (containerWidth - (5 * gap)) / 4;

        // Create new tiles
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] !== 0) {
                    const tile = document.createElement('div');
                    tile.classList.add('tile');
                    tile.setAttribute('data-value', this.grid[i][j]);
                    tile.textContent = this.grid[i][j];
                    tile.style.left = (j * (tileSize + gap) + gap) + 'px';
                    tile.style.top = (i * (tileSize + gap) + gap) + 'px';
                    this.gameContainer.appendChild(tile);
                }
            }
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreDisplay.textContent = this.bestScore;
        }
    }

    move(direction) {
        let moved = false;
        const originalGrid = JSON.stringify(this.grid);

        // Helper function to rotate the grid
        const rotateGrid = (grid) => {
            const N = grid.length;
            const rotated = Array(N).fill().map(() => Array(N).fill(0));
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    rotated[i][j] = grid[N - 1 - j][i];
                }
            }
            return rotated;
        };

        // Rotate grid according to direction
        let rotations = 0;
        if (direction === 'right') rotations = 2;
        else if (direction === 'up') rotations = 1;
        else if (direction === 'down') rotations = 3;

        for (let i = 0; i < rotations; i++) {
            this.grid = rotateGrid(this.grid);
        }

        // Move and merge tiles
        let mergeHappened = false;
        for (let i = 0; i < this.gridSize; i++) {
            let row = this.grid[i].filter(cell => cell !== 0);
            for (let j = 0; j < row.length - 1; j++) {
                if (row[j] === row[j + 1]) {
                    row[j] *= 2;
                    this.score += row[j];
                    row.splice(j + 1, 1);
                    mergeHappened = true;
                }
            }
            row = row.concat(Array(this.gridSize - row.length).fill(0));
            this.grid[i] = row;
        }

        // Rotate back
        for (let i = 0; i < (4 - rotations) % 4; i++) {
            this.grid = rotateGrid(this.grid);
        }

        if (JSON.stringify(this.grid) !== originalGrid) {
            moved = true;
            this.addNewTile();
            // 播放合并音效
            if (mergeHappened) {
                this.soundEffects.createMergeSound();
            }
        }

        this.updateGrid();
        this.updateScore();
        return moved;
    }

    isGameOver() {
        // Check for empty cells
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        // Check for possible merges
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const current = this.grid[i][j];
                if (
                    (i < this.gridSize - 1 && current === this.grid[i + 1][j]) ||
                    (j < this.gridSize - 1 && current === this.grid[i][j + 1])
                ) {
                    return false;
                }
            }
        }

        // 播放游戏结束音效
        this.soundEffects.createGameOverSound();
        return true;
    }
}

// Initialize game
let game = new Game2048();

// Event listeners
document.getElementById('new-game').addEventListener('click', () => {
    game = new Game2048();
});

document.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const direction = event.key.toLowerCase().replace('arrow', '');
        const moved = game.move(direction);
        
        if (moved && game.isGameOver()) {
            setTimeout(() => {
                alert('Game Over! Your score: ' + game.score);
            }, 300);
        }
    }
}); 
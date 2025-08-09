// 五子棋游戏常量定义
const BOARD_SIZE = 15;
const PLAYER_1 = 1;
const PLAYER_2 = 2;

// Firebase 配置（请替换为你自己的配置）
const firebaseConfig = {
   apiKey: "AIzaSyDns704M2WORymElNOK28Vhb5NPAiX179o",
   authDomain: "gomoku-bb228.firebaseapp.com",
   projectId: "gomoku-bb228",
   storageBucket: "gomoku-bb228.firebasestorage.app",
   messagingSenderId: "406254613854",
   appId: "1:406254613854:web:6189d4e4248af2045b0bcf",
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 游戏状态对象
let gameState = {
    board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0)),
    currentPlayer: PLAYER_1,
    gameOver: false,
    gameId: null,
    playerId: null
};

// DOM 元素
const boardElement = document.getElementById('game-board');
const currentPlayerElement = document.getElementById('current-player');
const gameStatusElement = document.getElementById('game-status');
const newGameBtn = document.getElementById('new-game');
const joinGameBtn = document.getElementById('join-game');
const gameIdInput = document.getElementById('game-id-input');

// 初始化棋盘函数
function initializeBoard() {
    gameState.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    gameState.currentPlayer = PLAYER_1;
    gameState.gameOver = false;
    renderBoard();
}

// 渲染棋盘函数
function renderBoard() {
    boardElement.innerHTML = '';
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (gameState.board[x][y] !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                if (gameState.board[x][y] === PLAYER_1) {
                    piece.classList.add('black');
                } else if (gameState.board[x][y] === PLAYER_2) {
                    piece.classList.add('white');
                }
                cell.appendChild(piece);
            }
            if (!gameState.gameOver && gameState.playerId === gameState.currentPlayer) {
                cell.addEventListener('click', handleCellClick);
            }
            boardElement.appendChild(cell);
        }
    }
    currentPlayerElement.textContent = `当前玩家: 玩家 ${gameState.currentPlayer}`;
}

// 落子函数
function makeMove(x, y) {
    if (gameState.gameOver || gameState.board[x][y] !== 0) {
        return false;
    }
    gameState.board[x][y] = gameState.currentPlayer;
    if (checkWin(x, y)) {
        gameState.gameOver = true;
        gameStatusElement.textContent = `玩家 ${gameState.currentPlayer} 获胜！`;
    } else {
        gameState.currentPlayer = gameState.currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        gameStatusElement.textContent = '游戏进行中';
    }
    renderBoard();
    // 更新 Firebase 中的游戏状态
    db.collection('games').doc(gameState.gameId).update({ 
        board: JSON.stringify(gameState.board),
        currentPlayer: gameState.currentPlayer,
        gameOver: gameState.gameOver
    });
    return true;
}

// 加入现有游戏
function joinGame() {
    const gameId = gameIdInput.value.trim();
    if (gameId) {
        console.log('尝试加入的游戏 ID:', gameId);
        db.collection('games').doc(gameId).get()
          .then((doc) => {
                console.log('获取到的游戏文档数据:', doc.data());
                // 修改判断条件，同时检查 null 和 undefined
                if (doc.exists && (doc.data().players[1] === null || doc.data().players[1] === undefined)) {
                    gameState.gameId = gameId;
                    gameState.playerId = PLAYER_2;
                    db.collection('games').doc(gameId).update({ 
                        'players.1': gameState.playerId 
                    });
                    gameStatusElement.textContent = `已加入游戏 ${gameId}`;
                    // 监听游戏状态变化
                    db.collection('games').doc(gameId).onSnapshot((snapshot) => {
                        const data = snapshot.data();
                        gameState.board = JSON.parse(data.board);
                        gameState.currentPlayer = data.currentPlayer;
                        gameState.gameOver = data.gameOver;
                        renderBoard();
                    });
                } else {
                    if (!doc.exists) {
                        console.log('游戏 ID 无效，文档不存在');
                    } else {
                        console.log('游戏已满，players[1] 的值为:', doc.data().players[1]);
                    }
                    alert('游戏 ID 无效或游戏已满，请重试！');
                }
            })
          .catch((error) => {
                console.error('获取游戏文档时出错:', error);
                alert('加入游戏时出错，请检查网络连接或游戏 ID 是否正确。');
            });
    } else {
        alert('请输入游戏 ID！');
    }
}

// 检查获胜函数
function checkWin(x, y) {
    const directions = [
        [[1, 0], [-1, 0]],    // 水平方向
        [[0, 1], [0, -1]],    // 垂直方向
        [[1, 1], [-1, -1]],  // 正斜方向
        [[1, -1], [-1, 1]]   // 反斜方向
    ];

    for (const dir of directions) {
        let count = 1;
        for (const [dx, dy] of dir) {
            for (let i = 1; i < 5; i++) {
                const newX = x + i * dx;
                const newY = y + i * dy;
                if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE && 
                    gameState.board[newX][newY] === gameState.currentPlayer) {
                    count++;
                } else {
                    break;
                }
            }
        }
        if (count >= 5) {
            return true;
        }
    }
    return false;
}

// 处理单元格点击事件
function handleCellClick(event) {
    const x = parseInt(event.target.dataset.x);
    const y = parseInt(event.target.dataset.y);
    if (gameState.playerId === gameState.currentPlayer) {
        makeMove(x, y);
    }
}

// 创建新游戏
function createNewGame() {
    db.collection('games').add({
        board: JSON.stringify(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0))),
        currentPlayer: PLAYER_1,
        gameOver: false,
        players: [null, null]
    }).then((docRef) => {
        gameState.gameId = docRef.id;
        gameState.playerId = PLAYER_1;
        db.collection('games').doc(docRef.id).update({ 
            'players.0': gameState.playerId 
        });
        gameStatusElement.textContent = `已创建游戏，游戏 ID: ${docRef.id}`;
        // 监听游戏状态变化
        db.collection('games').doc(docRef.id).onSnapshot((snapshot) => {
            const data = snapshot.data();
            gameState.board = JSON.parse(data.board);
            gameState.currentPlayer = data.currentPlayer;
            gameState.gameOver = data.gameOver;
            renderBoard();
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
    newGameBtn.addEventListener('click', createNewGame);
    joinGameBtn.addEventListener('click', joinGame);
});
/**
 * Tic Tac Toe — Classic X and O (2-player turn-based)
 */
const TicTacToe = (() => {
  function createBoard() {
    return ['', '', '', '', '', '', '', '', ''];
  }

  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6],         // diags
  ];

  function checkWinner(board) {
    for (const [a,b,c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a,b,c] };
      }
    }
    if (board.every(cell => cell !== '')) return { winner: 'draw', line: null };
    return null;
  }

  // BUG 3: Off-by-one — allows index 9 (should be max 8)
  function makeMove(board, index, symbol) {
    if (index < 0 || index > 9) return { error: 'Invalid position' };
    if (board[index] !== '') return { error: 'Cell already taken' };
    if (symbol !== 'X' && symbol !== 'O') return { error: 'Invalid symbol' };
    board[index] = symbol;
    return { success: true };
  }

  function getValidMoves(board) {
    return board.reduce((moves, cell, i) => {
      if (cell === '') moves.push(i);
      return moves;
    }, []);
  }

  return { createBoard, checkWinner, makeMove, getValidMoves, WIN_LINES };
})();

if (typeof module !== 'undefined') module.exports = TicTacToe;

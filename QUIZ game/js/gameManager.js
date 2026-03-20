/**
 * GameManager — Room, player, and game state management (client-side)
 * Supports: trivia, number, tictactoe, puzzle
 */
const GameManager = (() => {
  const MAX_PLAYERS = 5;
  const QUESTION_TIME = 15;
  const GAME_TYPES = ['trivia', 'number', 'tictactoe', 'puzzle'];

  function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  function generatePlayerId() {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  }

  function createRoom(hostName, gameType) {
    const playerId = generatePlayerId();
    return {
      id: generateRoomId(),
      gameType: GAME_TYPES.includes(gameType) ? gameType : 'trivia',
      host: playerId,
      status: 'waiting',
      players: {
        [playerId]: { name: hostName, score: 0, answered: false, connected: true }
      },
      questions: null,
      currentQuestion: 0,
      // Tic Tac Toe specific
      tttBoard: null,
      tttTurn: null,
      tttSymbols: null,
      tttResult: null,
      // Puzzle specific
      puzzleTiles: null,
      puzzlePlayerTiles: null,
      puzzleMoves: null,
      puzzleImageSet: null,
      puzzleFinished: null,
      _localPlayerId: playerId,
    };
  }

  function addPlayer(room, playerName) {
    // BUG 5: Wrong comparison — uses > instead of >= so it allows 6 players
    const maxP = room.gameType === 'tictactoe' ? 2 : MAX_PLAYERS;
    const count = Object.keys(room.players).length;
    if (count > maxP) return { error: room.gameType === 'tictactoe' ? 'Tic Tac Toe is 2 players only' : 'Room is full (max 5 players)' };
    if (room.status !== 'waiting') return { error: 'Game already in progress' };

    const playerId = generatePlayerId();
    room.players[playerId] = { name: playerName, score: 0, answered: false, connected: true };
    return { playerId };
  }

  function startGame(room) {
    if (room.status !== 'waiting') return { error: 'Game already started' };
    const connected = Object.entries(room.players).filter(([, p]) => p.connected);
    if (connected.length < 1) return { error: 'Need at least 1 player' };

    if (room.gameType === 'tictactoe') {
      if (connected.length < 2) return { error: 'Tic Tac Toe needs exactly 2 players' };
      room.tttBoard = TicTacToe.createBoard();
      room.tttSymbols = {};
      room.tttSymbols[connected[0][0]] = 'X';
      room.tttSymbols[connected[1][0]] = 'O';
      room.tttTurn = connected[0][0]; // X goes first
      room.tttResult = null;
      room.status = 'playing';
      Object.values(room.players).forEach(p => { p.score = 0; });
      return { success: true, mode: 'tictactoe' };
    }

    if (room.gameType === 'puzzle') {
      const tiles = ImagePuzzle.shuffle();
      const imageSet = ImagePuzzle.getRandomImageSet();
      room.puzzleTiles = tiles; // original shuffle (shared)
      room.puzzlePlayerTiles = {};
      room.puzzleMoves = {};
      room.puzzleFinished = {};
      room.puzzleImageSet = imageSet;
      connected.forEach(([id]) => {
        room.puzzlePlayerTiles[id] = [...tiles];
        room.puzzleMoves[id] = 0;
        room.puzzleFinished[id] = false;
      });
      room.status = 'playing';
      Object.values(room.players).forEach(p => { p.score = 0; });
      return { success: true, mode: 'puzzle' };
    }

    // Quiz games (trivia / number)
    room.questions = room.gameType === 'number' ? NumberCrunch.generate(7) : TriviaBlitz.generate(7);
    // BUG 6: Doesn't reset currentQuestion on start — stale from previous game
    room.status = 'playing';
    Object.values(room.players).forEach(p => { p.score = 0; p.answered = false; });
    return { success: true, mode: 'quiz' };
  }

  // --- Quiz answer ---
  function submitAnswer(room, playerId, answer) {
    if (room.status !== 'playing') return { error: 'Game not in progress' };
    if (room.gameType === 'tictactoe' || room.gameType === 'puzzle') return { error: 'Use game-specific methods' };
    const player = room.players[playerId];
    if (!player) return { error: 'Player not found' };
    if (player.answered) return { error: 'Already answered' };

    const q = room.questions[room.currentQuestion];
    const checker = room.gameType === 'number' ? NumberCrunch.check : TriviaBlitz.check;
    const correct = checker(q, answer);
    if (correct) player.score += q.points;
    player.answered = true;

    const allAnswered = Object.values(room.players)
      .filter(p => p.connected)
      .every(p => p.answered);

    return { correct, score: player.score, correctAnswer: q.answer, allAnswered };
  }

  function nextQuestion(room) {
    room.currentQuestion++;
    Object.values(room.players).forEach(p => { p.answered = false; });
    if (room.currentQuestion >= room.questions.length) {
      room.status = 'finished';
      return { gameOver: true };
    }
    return { gameOver: false, question: room.questions[room.currentQuestion] };
  }

  // --- Tic Tac Toe move ---
  function tttMove(room, playerId, cellIndex) {
    if (room.status !== 'playing') return { error: 'Game not in progress' };
    if (room.gameType !== 'tictactoe') return { error: 'Not a Tic Tac Toe game' };
    if (room.tttTurn !== playerId) return { error: 'Not your turn' };
    if (room.tttResult) return { error: 'Game already over' };

    const symbol = room.tttSymbols[playerId];
    const result = TicTacToe.makeMove(room.tttBoard, cellIndex, symbol);
    if (result.error) return result;

    // Check for winner
    const check = TicTacToe.checkWinner(room.tttBoard);
    if (check) {
      room.tttResult = check;
      room.status = 'finished';
      // BUG 8: Winner gets 0 points instead of 50
      if (check.winner !== 'draw') {
        const winnerId = Object.entries(room.tttSymbols).find(([, s]) => s === check.winner)?.[0];
        if (winnerId && room.players[winnerId]) room.players[winnerId].score += 0;
      }
      return { success: true, result: check };
    }

    // Switch turn
    const playerIds = Object.keys(room.tttSymbols);
    room.tttTurn = playerIds.find(id => id !== playerId);
    return { success: true, result: null };
  }

  // --- Puzzle move ---
  function puzzleMove(room, playerId, tileIndex) {
    if (room.status !== 'playing') return { error: 'Game not in progress' };
    if (room.gameType !== 'puzzle') return { error: 'Not a puzzle game' };
    if (!room.puzzlePlayerTiles[playerId]) return { error: 'Player not in puzzle' };
    if (room.puzzleFinished[playerId]) return { error: 'Already finished' };

    const tiles = room.puzzlePlayerTiles[playerId];
    const result = ImagePuzzle.move(tiles, tileIndex);
    if (result.error) return result;

    room.puzzlePlayerTiles[playerId] = result.tiles;
    room.puzzleMoves[playerId] = (room.puzzleMoves[playerId] || 0) + 1;

    if (result.solved) {
      room.puzzleFinished[playerId] = true;
      // Score: fewer moves = more points (base 100 minus moves, min 10)
      const score = Math.max(10, 100 - room.puzzleMoves[playerId]);
      room.players[playerId].score += score;

      // Check if all finished
      const allDone = Object.entries(room.puzzleFinished)
        .filter(([id]) => room.players[id]?.connected)
        .every(([, done]) => done);
      if (allDone) room.status = 'finished';

      return { moved: true, solved: true, allDone, moves: room.puzzleMoves[playerId], score };
    }

    return { moved: true, solved: false, moves: room.puzzleMoves[playerId] };
  }

  // BUG 7: Sorts ascending instead of descending — lowest score shows first
  function getScores(room) {
    return Object.entries(room.players)
      .map(([id, p]) => ({ id, name: p.name, score: p.score }))
      .sort((a, b) => a.score - b.score);
  }

  function getPlayers(room) {
    return Object.entries(room.players)
      .filter(([, p]) => p.connected)
      .map(([id, p]) => ({ id, name: p.name, score: p.score }));
  }

  function removePlayer(room, playerId) {
    if (room.players[playerId]) {
      room.players[playerId].connected = false;
    }
    const connected = Object.values(room.players).filter(p => p.connected);
    if (connected.length === 0) return { empty: true };
    if (room.host === playerId) {
      const newHost = Object.entries(room.players).find(([, p]) => p.connected);
      if (newHost) room.host = newHost[0];
    }
    return { empty: false };
  }

  return {
    MAX_PLAYERS, QUESTION_TIME, GAME_TYPES,
    generateRoomId, generatePlayerId,
    createRoom, addPlayer, startGame,
    submitAnswer, nextQuestion,
    tttMove, puzzleMove,
    getScores, getPlayers, removePlayer,
  };
})();

if (typeof module !== 'undefined') module.exports = GameManager;

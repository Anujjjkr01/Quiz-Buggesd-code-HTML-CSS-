/**
 * BrainClash — Main App Controller (4 games, dashboard, multiplayer)
 */
(function () {
  'use strict';

  // --- State ---
  let room = null;
  let myPlayerId = null;
  let selectedGame = null;
  let timerInterval = null;
  let puzzleTimerInterval = null;
  let puzzleSeconds = 0;
  let timeLeft = 0;
  let unsubscribe = null;

  const $ = id => document.getElementById(id);
  const screens = document.querySelectorAll('.screen');

  const GAME_INFO = {
    trivia:    { title: '❓ Trivia Blitz', desc: 'Quick-fire knowledge quiz · 1-5 players' },
    number:    { title: '🔢 Number Crunch', desc: 'Speed math puzzles · 1-5 players' },
    tictactoe: { title: '❌⭕ Tic Tac Toe', desc: 'Classic X & O battle · 2 players' },
    puzzle:    { title: '🧩 Image Puzzle', desc: 'Sliding tile race · 1-5 players' },
  };

  function showScreen(id) {
    screens.forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // --- Init Firebase ---
  FirebaseSync.init();

  // =============================================
  // DASHBOARD
  // =============================================
  document.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = $('playerName').value.trim();
      if (!name) { toast('Enter your nickname first'); $('playerName').focus(); return; }
      selectedGame = card.dataset.game;
      $('modeGameTitle').textContent = GAME_INFO[selectedGame].title;
      $('modeGameDesc').textContent = GAME_INFO[selectedGame].desc;
      showScreen('modeSelect');
    });
  });

  // =============================================
  // MODE SELECT
  // =============================================
  $('btnBackDash').addEventListener('click', () => showScreen('dashboard'));

  $('btnCreate').addEventListener('click', () => {
    const name = $('playerName').value.trim();
    room = GameManager.createRoom(name, selectedGame);
    myPlayerId = room._localPlayerId;
    FirebaseSync.syncRoom(room);
    FirebaseSync.onDisconnect(room.id, myPlayerId);
    listenToRoom(room.id);
    enterLobby(true);
  });

  $('btnJoin').addEventListener('click', () => {
    const name = $('playerName').value.trim();
    const code = $('roomCodeInput').value.trim().toUpperCase();
    if (!code) { toast('Enter a room code'); return; }
    if (FirebaseSync.isConnected) {
      joinOnlineRoom(code, name);
    } else {
      toast('Offline mode — can only create rooms');
    }
  });

  $('btnRandom').addEventListener('click', async () => {
    const name = $('playerName').value.trim();
    if (FirebaseSync.isConnected) {
      const open = await FirebaseSync.findOpenRoom(selectedGame);
      if (open) {
        await joinOnlineRoom(open.id, name);
      } else {
        room = GameManager.createRoom(name, selectedGame);
        myPlayerId = room._localPlayerId;
        FirebaseSync.syncRoom(room);
        FirebaseSync.onDisconnect(room.id, myPlayerId);
        listenToRoom(room.id);
        enterLobby(true);
        toast('No open rooms — created one. Share the code!');
      }
    } else {
      room = GameManager.createRoom(name, selectedGame);
      myPlayerId = room._localPlayerId;
      enterLobby(true);
    }
  });

  async function joinOnlineRoom(code, name) {
    const ref = firebase.database().ref('rooms/' + code);
    const snap = await ref.once('value');
    const data = snap.val();
    if (!data) { toast('Room not found'); return; }
    room = data;
    room.id = code;
    const result = GameManager.addPlayer(room, name);
    if (result.error) { toast(result.error); return; }
    myPlayerId = result.playerId;
    room._localPlayerId = myPlayerId;
    FirebaseSync.syncRoom(room);
    FirebaseSync.onDisconnect(room.id, myPlayerId);
    listenToRoom(room.id);
    enterLobby(false);
  }

  // =============================================
  // LOBBY
  // =============================================
  function enterLobby(isHost) {
    $('lobbyCode').textContent = room.id;
    $('lobbyGameLabel').textContent = GAME_INFO[room.gameType]?.title || room.gameType;
    $('btnStart').style.display = isHost ? 'block' : 'none';
    renderPlayerList();
    showScreen('lobby');
  }

  function renderPlayerList() {
    const ul = $('playerList');
    ul.innerHTML = '';
    Object.entries(room.players).forEach(([id, p]) => {
      if (!p.connected) return;
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = p.name;
      if (id === myPlayerId) nameSpan.classList.add('you');
      li.appendChild(nameSpan);
      if (id === room.host) {
        const badge = document.createElement('span');
        badge.className = 'host-badge';
        badge.textContent = 'HOST';
        li.appendChild(badge);
      }
      ul.appendChild(li);
    });
    const count = Object.values(room.players).filter(p => p.connected).length;
    const minPlayers = room.gameType === 'tictactoe' ? 2 : 1;
    $('waitMsg').style.display = count < minPlayers ? 'block' : 'none';
    $('waitMsg').textContent = room.gameType === 'tictactoe' ? 'Need 2 players to start…' : 'Waiting for players…';
  }

  $('btnCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(room.id).then(() => toast('Code copied!')).catch(() => toast(room.id));
  });

  $('btnBackMode').addEventListener('click', () => {
    if (room && myPlayerId) {
      GameManager.removePlayer(room, myPlayerId);
      FirebaseSync.syncRoom(room);
    }
    if (unsubscribe) unsubscribe();
    room = null;
    myPlayerId = null;
    showScreen('modeSelect');
  });

  $('btnStart').addEventListener('click', () => {
    const result = GameManager.startGame(room);
    if (result.error) { toast(result.error); return; }
    FirebaseSync.syncRoom(room);
    launchGame();
  });

  // =============================================
  // FIREBASE LISTENER
  // =============================================
  function listenToRoom(roomId) {
    if (unsubscribe) unsubscribe();
    unsubscribe = FirebaseSync.onRoomUpdate(roomId, (data) => {
      const localPid = myPlayerId;
      room = { ...data, id: roomId, _localPlayerId: localPid };

      if (room.status === 'waiting') {
        renderPlayerList();
        $('btnStart').style.display = room.host === myPlayerId ? 'block' : 'none';
      } else if (room.status === 'playing') {
        if ($('lobby').classList.contains('active')) {
          launchGame();
        } else {
          refreshGameUI();
        }
      } else if (room.status === 'finished') {
        enterResults();
      }
    });
  }

  function launchGame() {
    switch (room.gameType) {
      case 'tictactoe': enterTTT(); break;
      case 'puzzle': enterPuzzle(); break;
      default: enterQuiz(); break;
    }
  }

  function refreshGameUI() {
    switch (room.gameType) {
      case 'tictactoe': renderTTTBoard(); renderLiveScores('tttScores'); break;
      case 'puzzle': renderPuzzleGrid(); renderLiveScores('puzzleScores'); break;
      default: renderQuestion(); renderLiveScores('liveScores'); break;
    }
  }

  // =============================================
  // QUIZ GAME (trivia + number)
  // =============================================
  function enterQuiz() {
    showScreen('quizGame');
    renderQuestion();
    renderLiveScores('liveScores');
    startQuizTimer();
  }

  function renderQuestion() {
    const q = room.questions?.[room.currentQuestion];
    if (!q) return;
    $('qCounter').textContent = `${room.currentQuestion + 1} / ${room.questions.length}`;
    $('myScore').textContent = `Score: ${room.players[myPlayerId]?.score || 0}`;
    $('qText').textContent = q.display.question;
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';

    const container = $('opts');
    container.innerHTML = '';
    q.display.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleQuizAnswer(opt, container));
      container.appendChild(btn);
    });
  }

  function handleQuizAnswer(answer, container) {
    if (room.players[myPlayerId]?.answered) return;
    const result = GameManager.submitAnswer(room, myPlayerId, answer);
    if (result.error) return;

    container.querySelectorAll('.opt-btn').forEach(btn => {
      btn.classList.add('locked');
      if (btn.textContent === result.correctAnswer) btn.classList.add('correct');
      if (btn.textContent === answer && !result.correct) btn.classList.add('wrong');
    });

    $('feedback').textContent = result.correct ? '✅ Correct!' : `❌ Answer: ${result.correctAnswer}`;
    $('feedback').className = 'feedback ' + (result.correct ? 'correct' : 'wrong');
    $('myScore').textContent = `Score: ${result.score}`;
    FirebaseSync.syncRoom(room);
    renderLiveScores('liveScores');
    clearInterval(timerInterval);

    if (result.allAnswered) advanceQuiz();
  }

  function advanceQuiz() {
    setTimeout(() => {
      const next = GameManager.nextQuestion(room);
      FirebaseSync.syncRoom(room);
      if (next.gameOver) {
        enterResults();
      } else {
        renderQuestion();
        renderLiveScores('liveScores');
        startQuizTimer();
      }
    }, 1500);
  }

  function startQuizTimer() {
    clearInterval(timerInterval);
    timeLeft = GameManager.QUESTION_TIME;
    $('timer').textContent = '⏱ ' + timeLeft;
    $('timer').classList.remove('danger');
    timerInterval = setInterval(() => {
      timeLeft--;
      $('timer').textContent = '⏱ ' + timeLeft;
      if (timeLeft <= 5) $('timer').classList.add('danger');
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (!room.players[myPlayerId]?.answered) {
          handleQuizAnswer('__timeout__', $('opts'));
        }
      }
    }, 1000);
  }

  // =============================================
  // TIC TAC TOE
  // =============================================
  function enterTTT() {
    showScreen('tttGame');
    renderTTTBoard();
    renderLiveScores('tttScores');
  }

  function renderTTTBoard() {
    const board = $('tttBoard');
    board.innerHTML = '';
    const mySymbol = room.tttSymbols?.[myPlayerId];
    const isMyTurn = room.tttTurn === myPlayerId;
    const result = room.tttResult;

    // Status
    const status = $('tttStatus');
    if (result) {
      if (result.winner === 'draw') {
        status.textContent = "It's a draw!";
        status.className = 'ttt-status';
      } else {
        const winnerName = Object.entries(room.tttSymbols).find(([, s]) => s === result.winner);
        const wName = winnerName ? room.players[winnerName[0]]?.name : result.winner;
        status.textContent = `${wName} (${result.winner}) wins!`;
        status.className = 'ttt-status';
      }
    } else if (isMyTurn) {
      status.textContent = `Your turn — you are ${mySymbol}`;
      status.className = 'ttt-status ' + (mySymbol === 'X' ? 'x-turn' : 'o-turn');
    } else {
      status.textContent = 'Waiting for opponent…';
      status.className = 'ttt-status';
    }

    $('tttScoreDisplay').textContent = `Score: ${room.players[myPlayerId]?.score || 0}`;

    // Board cells
    room.tttBoard.forEach((cell, i) => {
      const div = document.createElement('div');
      div.className = 'ttt-cell';
      div.setAttribute('role', 'gridcell');
      div.setAttribute('aria-label', `Cell ${i + 1}: ${cell || 'empty'}`);

      if (cell) {
        div.textContent = cell;
        div.classList.add('taken', cell.toLowerCase());
      }

      if (result?.line?.includes(i)) {
        div.classList.add('win-cell');
      }

      if (!cell && isMyTurn && !result) {
        div.addEventListener('click', () => handleTTTMove(i));
      }

      board.appendChild(div);
    });
  }

  function handleTTTMove(cellIndex) {
    const result = GameManager.tttMove(room, myPlayerId, cellIndex);
    if (result.error) { toast(result.error); return; }
    FirebaseSync.syncRoom(room);
    renderTTTBoard();
    renderLiveScores('tttScores');

    if (result.result) {
      setTimeout(() => enterResults(), 1500);
    }
  }

  // =============================================
  // IMAGE PUZZLE
  // =============================================
  function enterPuzzle() {
    showScreen('puzzleGame');
    puzzleSeconds = 0;
    startPuzzleTimer();
    renderPuzzleGrid();
    renderLiveScores('puzzleScores');
  }

  function startPuzzleTimer() {
    clearInterval(puzzleTimerInterval);
    puzzleTimerInterval = setInterval(() => {
      puzzleSeconds++;
      const m = Math.floor(puzzleSeconds / 60);
      const s = puzzleSeconds % 60;
      $('puzzleTimer').textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function renderPuzzleGrid() {
    const grid = $('puzzleGrid');
    grid.innerHTML = '';
    const tiles = room.puzzlePlayerTiles?.[myPlayerId];
    if (!tiles) return;

    const imageSet = room.puzzleImageSet;
    const moves = room.puzzleMoves?.[myPlayerId] || 0;
    const finished = room.puzzleFinished?.[myPlayerId];

    $('puzzleMoves').textContent = `Moves: ${moves}`;
    $('puzzleScoreDisplay').textContent = `Score: ${room.players[myPlayerId]?.score || 0}`;

    if (finished) {
      $('puzzleStatus').textContent = '🎉 Puzzle solved! Waiting for others…';
      $('puzzleStatus').style.color = 'var(--ok)';
    } else {
      $('puzzleStatus').textContent = `${imageSet?.label || 'Puzzle'} — slide tiles to solve`;
      $('puzzleStatus').style.color = '';
    }

    tiles.forEach((tile, i) => {
      const div = document.createElement('div');
      div.className = 'puzzle-tile';
      div.setAttribute('role', 'gridcell');

      if (tile === 0) {
        div.classList.add('empty');
        div.setAttribute('aria-label', 'Empty space');
      } else {
        const emoji = imageSet?.emojis?.[tile - 1] || tile;
        div.textContent = emoji;
        div.setAttribute('aria-label', `Tile ${tile}`);

        if (ImagePuzzle.canMove(tiles, i) && !finished) {
          div.classList.add('movable');
          div.addEventListener('click', () => handlePuzzleMove(i));
        }

        // Highlight if in correct position
        if (tile === i + 1) div.classList.add('solved');
      }

      grid.appendChild(div);
    });
  }

  function handlePuzzleMove(tileIndex) {
    const result = GameManager.puzzleMove(room, myPlayerId, tileIndex);
    if (result.error) return;

    FirebaseSync.syncRoom(room);
    renderPuzzleGrid();
    renderLiveScores('puzzleScores');

    if (result.solved) {
      clearInterval(puzzleTimerInterval);
      toast(`Solved in ${result.moves} moves! Score: +${result.score}`);
      if (result.allDone) {
        setTimeout(() => enterResults(), 1500);
      }
    }
  }

  // =============================================
  // SHARED: Live Scores
  // =============================================
  function renderLiveScores(containerId) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = '';
    GameManager.getScores(room).forEach(s => {
      const chip = document.createElement('div');
      chip.className = 'score-chip';
      chip.innerHTML = `<span>${s.name}${s.id === myPlayerId ? ' (You)' : ''}</span><span class="pts">${s.score}</span>`;
      el.appendChild(chip);
    });
  }

  // =============================================
  // RESULTS
  // =============================================
  function enterResults() {
    clearInterval(timerInterval);
    clearInterval(puzzleTimerInterval);
    showScreen('results');

    // Detail text
    const detail = $('resultDetail');
    if (room.gameType === 'tictactoe' && room.tttResult) {
      if (room.tttResult.winner === 'draw') {
        detail.textContent = "It's a draw! Well played.";
      } else {
        const winnerId = Object.entries(room.tttSymbols).find(([, s]) => s === room.tttResult.winner)?.[0];
        const wName = winnerId ? room.players[winnerId]?.name : '?';
        detail.textContent = `${wName} wins with ${room.tttResult.winner}!`;
      }
    } else if (room.gameType === 'puzzle') {
      detail.textContent = 'Fewer moves = higher score!';
    } else {
      detail.textContent = `${GAME_INFO[room.gameType]?.title || 'Game'} complete!`;
    }

    const ol = $('finalScores');
    ol.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    GameManager.getScores(room).forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">${medals[i] || (i + 1)}</span><span class="name">${s.name}${s.id === myPlayerId ? ' (You)' : ''}</span><span class="pts">${s.score}</span>`;
      ol.appendChild(li);
    });
  }

  $('btnAgain').addEventListener('click', () => {
    if (room) {
      room.status = 'waiting';
      room.tttBoard = null;
      room.tttResult = null;
      room.questions = null;
      room.puzzlePlayerTiles = null;
      Object.values(room.players).forEach(p => { p.score = 0; p.answered = false; });
      FirebaseSync.syncRoom(room);
      enterLobby(room.host === myPlayerId);
    }
  });

  $('btnHome').addEventListener('click', () => {
    if (unsubscribe) unsubscribe();
    clearInterval(timerInterval);
    clearInterval(puzzleTimerInterval);
    room = null;
    myPlayerId = null;
    selectedGame = null;
    showScreen('dashboard');
  });

})();

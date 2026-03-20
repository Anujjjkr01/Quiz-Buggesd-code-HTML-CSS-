/**
 * BrainClash — Full Test Suite (pure JS, no dependencies)
 * Covers: TriviaBlitz, NumberCrunch, TicTacToe, ImagePuzzle, GameManager
 */
(function () {
  let passed = 0, failed = 0;
  const output = document.getElementById('output');

  function suite(name, fn) {
    const div = document.createElement('div');
    div.className = 'suite';
    div.innerHTML = `<div class="suite-name">▸ ${name}</div>`;
    output.appendChild(div);
    fn((desc, testFn) => {
      const result = document.createElement('div');
      result.className = 'test';
      try {
        testFn();
        result.innerHTML = `<span class="pass">✓</span> ${desc}`;
        passed++;
      } catch (e) {
        result.innerHTML = `<span class="fail">✗</span> ${desc} — <em>${e.message}</em>`;
        failed++;
      }
      div.appendChild(result);
    });
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
  function assertEqual(a, b, msg) { assert(a === b, msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

  // =============================================
  // TRIVIA BLITZ
  // =============================================
  suite('TriviaBlitz — Generation', (t) => {
    t('generates default 7 questions', () => assertEqual(TriviaBlitz.generate().length, 7));
    t('generates custom count', () => assertEqual(TriviaBlitz.generate(3).length, 3));
    t('each question has required fields', () => {
      TriviaBlitz.generate().forEach(q => {
        assert(q.display.question); assert(Array.isArray(q.display.options));
        assertEqual(q.display.options.length, 4); assert(q.answer); assert(q.points > 0);
        assertEqual(q.display.type, 'trivia');
      });
    });
    t('answer is always in options', () => {
      TriviaBlitz.generate().forEach(q => assert(q.display.options.includes(q.answer)));
    });
    t('no duplicate questions', () => {
      const qs = TriviaBlitz.generate(7);
      assertEqual(new Set(qs.map(q => q.display.question)).size, 7);
    });
    t('pool has enough questions', () => assert(TriviaBlitz.ALL_QUESTIONS.length >= 7));
  });

  suite('TriviaBlitz — Checking', (t) => {
    const q = { answer: 'Paris', points: 10, display: {} };
    t('correct answer', () => assert(TriviaBlitz.check(q, 'Paris')));
    t('case insensitive', () => assert(TriviaBlitz.check(q, 'paris')));
    t('trims whitespace', () => assert(TriviaBlitz.check(q, '  Paris  ')));
    t('wrong answer', () => assert(!TriviaBlitz.check(q, 'London')));
    t('empty answer', () => assert(!TriviaBlitz.check(q, '')));
  });

  // =============================================
  // NUMBER CRUNCH
  // =============================================
  suite('NumberCrunch — Generation', (t) => {
    t('generates default 7', () => assertEqual(NumberCrunch.generate().length, 7));
    t('generates custom count', () => assertEqual(NumberCrunch.generate(5).length, 5));
    t('required fields present', () => {
      NumberCrunch.generate().forEach(q => {
        assert(q.display.question); assertEqual(q.display.options.length, 4);
        assert(q.answer !== undefined); assert(q.points > 0); assertEqual(q.display.type, 'number');
      });
    });
    t('answer in options', () => {
      for (let i = 0; i < 10; i++)
        NumberCrunch.generate().forEach(q => assert(q.display.options.includes(q.answer)));
    });
    t('valid math format', () => {
      NumberCrunch.generate().forEach(q => assert(/What is \d+ [+\-*] \d+\?/.test(q.display.question)));
    });
    t('multiplication = 15pts, others = 10pts', () => {
      for (let i = 0; i < 20; i++)
        NumberCrunch.generate(12).forEach(q => {
          assertEqual(q.points, q.display.question.includes('*') ? 15 : 10);
        });
    });
    t('math answers are correct', () => {
      for (let i = 0; i < 30; i++)
        NumberCrunch.generate().forEach(q => {
          const m = q.display.question.match(/(\d+) ([+\-*]) (\d+)/);
          let exp; const [a, op, b] = [+m[1], m[2], +m[3]];
          if (op === '+') exp = a + b; else if (op === '-') exp = a - b; else exp = a * b;
          assertEqual(q.answer, String(exp));
        });
    });
  });

  suite('NumberCrunch — Checking', (t) => {
    const q = { answer: '42', points: 10, display: {} };
    t('correct', () => assert(NumberCrunch.check(q, '42')));
    t('wrong', () => assert(!NumberCrunch.check(q, '43')));
    t('number coercion', () => assert(NumberCrunch.check(q, 42)));
    t('trims whitespace', () => assert(NumberCrunch.check(q, ' 42 ')));
    t('negative answers', () => {
      const nq = { answer: '-5', points: 10, display: {} };
      assert(NumberCrunch.check(nq, '-5'));
      assert(!NumberCrunch.check(nq, '5'));
    });
  });

  // =============================================
  // TIC TAC TOE
  // =============================================
  suite('TicTacToe — Board', (t) => {
    t('creates empty 9-cell board', () => {
      const b = TicTacToe.createBoard();
      assertEqual(b.length, 9);
      assert(b.every(c => c === ''));
    });
    t('WIN_LINES has 8 combos', () => assertEqual(TicTacToe.WIN_LINES.length, 8));
  });

  suite('TicTacToe — Moves', (t) => {
    t('valid move succeeds', () => {
      const b = TicTacToe.createBoard();
      const r = TicTacToe.makeMove(b, 0, 'X');
      assert(r.success); assertEqual(b[0], 'X');
    });
    t('cannot move to taken cell', () => {
      const b = TicTacToe.createBoard();
      TicTacToe.makeMove(b, 0, 'X');
      assert(TicTacToe.makeMove(b, 0, 'O').error);
    });
    t('invalid index rejected', () => {
      const b = TicTacToe.createBoard();
      assert(TicTacToe.makeMove(b, -1, 'X').error);
      assert(TicTacToe.makeMove(b, 9, 'X').error);
    });
    t('invalid symbol rejected', () => {
      const b = TicTacToe.createBoard();
      assert(TicTacToe.makeMove(b, 0, 'Z').error);
    });
    t('getValidMoves returns empty cells', () => {
      const b = TicTacToe.createBoard();
      assertEqual(TicTacToe.getValidMoves(b).length, 9);
      TicTacToe.makeMove(b, 4, 'X');
      assertEqual(TicTacToe.getValidMoves(b).length, 8);
      assert(!TicTacToe.getValidMoves(b).includes(4));
    });
  });

  suite('TicTacToe — Win Detection', (t) => {
    t('detects row win', () => {
      const b = ['X','X','X','','','','','',''];
      const r = TicTacToe.checkWinner(b);
      assertEqual(r.winner, 'X');
      assert(r.line.includes(0) && r.line.includes(1) && r.line.includes(2));
    });
    t('detects column win', () => {
      const b = ['O','','','O','','','O','',''];
      assertEqual(TicTacToe.checkWinner(b).winner, 'O');
    });
    t('detects diagonal win', () => {
      const b = ['X','','','','X','','','','X'];
      assertEqual(TicTacToe.checkWinner(b).winner, 'X');
    });
    t('detects anti-diagonal win', () => {
      const b = ['','','O','','O','','O','',''];
      assertEqual(TicTacToe.checkWinner(b).winner, 'O');
    });
    t('detects draw', () => {
      const b = ['X','O','X','X','O','O','O','X','X'];
      assertEqual(TicTacToe.checkWinner(b).winner, 'draw');
    });
    t('no winner yet returns null', () => {
      const b = ['X','','','','O','','','',''];
      assertEqual(TicTacToe.checkWinner(b), null);
    });
    t('empty board returns null', () => {
      assertEqual(TicTacToe.checkWinner(TicTacToe.createBoard()), null);
    });
    t('all 8 win lines work', () => {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      lines.forEach(line => {
        const b = TicTacToe.createBoard();
        line.forEach(i => b[i] = 'X');
        assertEqual(TicTacToe.checkWinner(b).winner, 'X');
      });
    });
  });

  // =============================================
  // IMAGE PUZZLE
  // =============================================
  suite('ImagePuzzle — State', (t) => {
    t('solved state is [1..8, 0]', () => {
      const s = ImagePuzzle.solvedState();
      assertEqual(s.length, 9);
      assertEqual(s[8], 0);
      for (let i = 0; i < 8; i++) assertEqual(s[i], i + 1);
    });
    t('isSolved detects solved', () => assert(ImagePuzzle.isSolved([1,2,3,4,5,6,7,8,0])));
    t('isSolved rejects unsolved', () => assert(!ImagePuzzle.isSolved([1,2,3,4,5,6,8,7,0])));
    t('SIZE is 3', () => assertEqual(ImagePuzzle.SIZE, 3));
    t('TOTAL is 9', () => assertEqual(ImagePuzzle.TOTAL, 9));
  });

  suite('ImagePuzzle — Solvability', (t) => {
    t('solved state is solvable', () => assert(ImagePuzzle.isSolvable([1,2,3,4,5,6,7,8,0])));
    t('known unsolvable state', () => assert(!ImagePuzzle.isSolvable([1,2,3,4,5,6,8,7,0])));
    t('shuffle always produces solvable state', () => {
      for (let i = 0; i < 50; i++) {
        const tiles = ImagePuzzle.shuffle();
        assert(ImagePuzzle.isSolvable(tiles), 'Shuffle produced unsolvable state');
        assert(!ImagePuzzle.isSolved(tiles), 'Shuffle produced already-solved state');
      }
    });
    t('shuffle has all tiles 0-8', () => {
      const tiles = ImagePuzzle.shuffle();
      const sorted = [...tiles].sort((a, b) => a - b);
      for (let i = 0; i < 9; i++) assertEqual(sorted[i], i);
    });
    t('countInversions works', () => {
      assertEqual(ImagePuzzle.countInversions([1,2,3,4,5,6,7,8,0]), 0);
      assertEqual(ImagePuzzle.countInversions([2,1,3,4,5,6,7,8,0]), 1);
    });
  });

  suite('ImagePuzzle — Movement', (t) => {
    t('getEmptyIndex finds 0', () => {
      assertEqual(ImagePuzzle.getEmptyIndex([1,2,3,4,0,5,6,7,8]), 4);
      assertEqual(ImagePuzzle.getEmptyIndex([1,2,3,4,5,6,7,8,0]), 8);
    });
    t('getNeighbors for center (4)', () => {
      const n = ImagePuzzle.getNeighbors(4);
      assert(n.includes(1) && n.includes(3) && n.includes(5) && n.includes(7));
      assertEqual(n.length, 4);
    });
    t('getNeighbors for corner (0)', () => {
      const n = ImagePuzzle.getNeighbors(0);
      assert(n.includes(1) && n.includes(3));
      assertEqual(n.length, 2);
    });
    t('getNeighbors for edge (1)', () => {
      const n = ImagePuzzle.getNeighbors(1);
      assertEqual(n.length, 3);
      assert(n.includes(0) && n.includes(2) && n.includes(4));
    });
    t('canMove true for adjacent to empty', () => {
      const tiles = [1,2,3,4,0,5,6,7,8]; // empty at 4
      assert(ImagePuzzle.canMove(tiles, 1));  // above
      assert(ImagePuzzle.canMove(tiles, 3));  // left
      assert(ImagePuzzle.canMove(tiles, 5));  // right
      assert(ImagePuzzle.canMove(tiles, 7));  // below
    });
    t('canMove false for non-adjacent', () => {
      const tiles = [1,2,3,4,0,5,6,7,8];
      assert(!ImagePuzzle.canMove(tiles, 0));
      assert(!ImagePuzzle.canMove(tiles, 8));
    });
    t('move swaps tile with empty', () => {
      const tiles = [1,2,3,4,0,5,6,7,8];
      const r = ImagePuzzle.move(tiles, 1); // move tile at index 1 (value 2) down
      assertEqual(r.tiles[4], 2);
      assertEqual(r.tiles[1], 0);
    });
    t('move returns error for invalid', () => {
      const tiles = [1,2,3,4,0,5,6,7,8];
      assert(ImagePuzzle.move(tiles, 0).error);
    });
    t('move detects solved', () => {
      const tiles = [1,2,3,4,5,6,7,0,8]; // one move from solved
      const r = ImagePuzzle.move(tiles, 8); // move 8 left
      assert(r.solved);
    });
    t('move does not mutate original', () => {
      const tiles = [1,2,3,4,0,5,6,7,8];
      const copy = [...tiles];
      ImagePuzzle.move(tiles, 1);
      assert(tiles.every((t, i) => t === copy[i]), 'Original should not change');
    });
  });

  suite('ImagePuzzle — Images', (t) => {
    t('has 4 image sets', () => assertEqual(ImagePuzzle.IMAGES.length, 4));
    t('each set has 8 emojis', () => {
      ImagePuzzle.IMAGES.forEach(s => {
        assertEqual(s.emojis.length, 8);
        assert(s.id); assert(s.label);
      });
    });
    t('getRandomImageSet returns valid set', () => {
      const s = ImagePuzzle.getRandomImageSet();
      assert(s.id); assert(s.label); assertEqual(s.emojis.length, 8);
    });
  });

  // =============================================
  // GAME MANAGER — Room & Players
  // =============================================
  suite('GameManager — Room Creation', (t) => {
    t('creates room with 6-char ID', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      assertEqual(r.id.length, 6);
      assertEqual(r.status, 'waiting');
    });
    t('defaults to trivia', () => assertEqual(GameManager.createRoom('A').gameType, 'trivia'));
    t('supports all 4 game types', () => {
      ['trivia', 'number', 'tictactoe', 'puzzle'].forEach(g => {
        assertEqual(GameManager.createRoom('A', g).gameType, g);
      });
    });
    t('invalid game type defaults to trivia', () => {
      assertEqual(GameManager.createRoom('A', 'invalid').gameType, 'trivia');
    });
    t('host is first player', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      assertEqual(r.players[r.host].name, 'Alice');
    });
    t('unique room IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 50; i++) ids.add(GameManager.createRoom('T').id);
      assertEqual(ids.size, 50);
    });
    t('room ID format valid', () => {
      for (let i = 0; i < 100; i++)
        assert(/^[A-Z2-9]{6}$/.test(GameManager.generateRoomId()));
    });
  });

  suite('GameManager — Player Management', (t) => {
    t('add player', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      const res = GameManager.addPlayer(r, 'Bob');
      assert(!res.error); assert(res.playerId);
      assertEqual(Object.keys(r.players).length, 2);
    });
    t('max 5 for quiz games', () => {
      const r = GameManager.createRoom('P1', 'trivia');
      for (let i = 2; i <= 5; i++) GameManager.addPlayer(r, 'P' + i);
      assert(GameManager.addPlayer(r, 'P6').error);
    });
    t('max 2 for tictactoe', () => {
      const r = GameManager.createRoom('P1', 'tictactoe');
      GameManager.addPlayer(r, 'P2');
      assert(GameManager.addPlayer(r, 'P3').error);
    });
    t('cannot join in-progress game', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.addPlayer(r, 'Bob').error);
    });
    t('remove marks disconnected', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      const { playerId } = GameManager.addPlayer(r, 'Bob');
      GameManager.removePlayer(r, playerId);
      assertEqual(r.players[playerId].connected, false);
    });
    t('host transfers on disconnect', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      const { playerId: bobId } = GameManager.addPlayer(r, 'Bob');
      GameManager.removePlayer(r, r.host);
      assertEqual(r.host, bobId);
    });
    t('last player = empty room', () => {
      const r = GameManager.createRoom('Alice', 'trivia');
      assert(GameManager.removePlayer(r, r.host).empty);
    });
  });

  // =============================================
  // GAME MANAGER — Quiz Flow
  // =============================================
  suite('GameManager — Quiz Start', (t) => {
    t('starts trivia', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const res = GameManager.startGame(r);
      assert(res.success); assertEqual(res.mode, 'quiz');
      assertEqual(r.status, 'playing'); assertEqual(r.questions.length, 7);
    });
    t('starts number', () => {
      const r = GameManager.createRoom('A', 'number');
      const res = GameManager.startGame(r);
      assertEqual(res.mode, 'quiz');
      assertEqual(r.questions[0].display.type, 'number');
    });
    t('cannot start twice', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.startGame(r).error);
    });
    t('resets scores', () => {
      const r = GameManager.createRoom('A', 'trivia');
      r.players[r.host].score = 99;
      GameManager.startGame(r);
      assertEqual(r.players[r.host].score, 0);
    });
  });

  suite('GameManager — Quiz Answers', (t) => {
    t('correct adds points', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      const res = GameManager.submitAnswer(r, r.host, r.questions[0].answer);
      assert(res.correct); assert(res.score > 0);
    });
    t('wrong = 0 points', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assertEqual(GameManager.submitAnswer(r, r.host, '__wrong__').score, 0);
    });
    t('no double answer', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      GameManager.submitAnswer(r, r.host, r.questions[0].answer);
      assert(GameManager.submitAnswer(r, r.host, r.questions[0].answer).error);
    });
    t('allAnswered when all done', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const { playerId: b } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      GameManager.submitAnswer(r, r.host, r.questions[0].answer);
      assert(GameManager.submitAnswer(r, b, r.questions[0].answer).allAnswered);
    });
    t('unknown player error', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.submitAnswer(r, 'fake', 'x').error);
    });
  });

  suite('GameManager — Quiz Progression', (t) => {
    t('next advances index', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      GameManager.nextQuestion(r);
      assertEqual(r.currentQuestion, 1);
    });
    t('resets answered', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      r.players[r.host].answered = true;
      GameManager.nextQuestion(r);
      assertEqual(r.players[r.host].answered, false);
    });
    t('game over after last', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      r.currentQuestion = r.questions.length - 1;
      assert(GameManager.nextQuestion(r).gameOver);
      assertEqual(r.status, 'finished');
    });
    t('cumulative scoring', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      GameManager.submitAnswer(r, r.host, r.questions[0].answer);
      const s1 = r.players[r.host].score;
      GameManager.nextQuestion(r);
      GameManager.submitAnswer(r, r.host, r.questions[1].answer);
      assert(r.players[r.host].score >= s1);
    });
  });

  // =============================================
  // GAME MANAGER — Tic Tac Toe
  // =============================================
  suite('GameManager — TTT Start', (t) => {
    t('needs 2 players', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      assert(GameManager.startGame(r).error);
    });
    t('starts with 2 players', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      GameManager.addPlayer(r, 'B');
      const res = GameManager.startGame(r);
      assert(res.success); assertEqual(res.mode, 'tictactoe');
      assertEqual(r.tttBoard.length, 9);
    });
    t('assigns X and O', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      const syms = Object.values(r.tttSymbols);
      assert(syms.includes('X') && syms.includes('O'));
    });
    t('X goes first', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      assertEqual(r.tttSymbols[r.tttTurn], 'X');
    });
  });

  suite('GameManager — TTT Moves', (t) => {
    function setup() {
      const r = GameManager.createRoom('A', 'tictactoe');
      const { playerId: bId } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      const xId = Object.entries(r.tttSymbols).find(([,s]) => s === 'X')[0];
      const oId = Object.entries(r.tttSymbols).find(([,s]) => s === 'O')[0];
      return { r, xId, oId };
    }

    t('valid move succeeds', () => {
      const { r, xId } = setup();
      assert(GameManager.tttMove(r, xId, 4).success);
      assertEqual(r.tttBoard[4], 'X');
    });
    t('wrong turn rejected', () => {
      const { r, oId } = setup();
      assert(GameManager.tttMove(r, oId, 0).error);
    });
    t('turn switches after move', () => {
      const { r, xId, oId } = setup();
      GameManager.tttMove(r, xId, 0);
      assertEqual(r.tttTurn, oId);
    });
    t('taken cell rejected', () => {
      const { r, xId, oId } = setup();
      GameManager.tttMove(r, xId, 0);
      assert(GameManager.tttMove(r, oId, 0).error);
    });
    t('detects win', () => {
      const { r, xId, oId } = setup();
      GameManager.tttMove(r, xId, 0); GameManager.tttMove(r, oId, 3);
      GameManager.tttMove(r, xId, 1); GameManager.tttMove(r, oId, 4);
      const res = GameManager.tttMove(r, xId, 2); // X wins top row
      assert(res.result); assertEqual(res.result.winner, 'X');
      assertEqual(r.status, 'finished');
    });
    t('winner gets 50 points', () => {
      const { r, xId, oId } = setup();
      GameManager.tttMove(r, xId, 0); GameManager.tttMove(r, oId, 3);
      GameManager.tttMove(r, xId, 1); GameManager.tttMove(r, oId, 4);
      GameManager.tttMove(r, xId, 2);
      assertEqual(r.players[xId].score, 50);
      assertEqual(r.players[oId].score, 0);
    });
    t('detects draw', () => {
      const { r, xId, oId } = setup();
      // X O X / X X O / O X O
      GameManager.tttMove(r, xId, 0); GameManager.tttMove(r, oId, 1);
      GameManager.tttMove(r, xId, 2); GameManager.tttMove(r, oId, 5);
      GameManager.tttMove(r, xId, 3); GameManager.tttMove(r, oId, 6);
      GameManager.tttMove(r, xId, 4); GameManager.tttMove(r, oId, 8);
      const res = GameManager.tttMove(r, xId, 7);
      assert(res.result); assertEqual(res.result.winner, 'draw');
    });
    t('no moves after game over', () => {
      const { r, xId, oId } = setup();
      GameManager.tttMove(r, xId, 0); GameManager.tttMove(r, oId, 3);
      GameManager.tttMove(r, xId, 1); GameManager.tttMove(r, oId, 4);
      GameManager.tttMove(r, xId, 2); // X wins
      assert(GameManager.tttMove(r, oId, 5).error);
    });
    t('not a ttt game error', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.tttMove(r, r.host, 0).error);
    });
  });

  // =============================================
  // GAME MANAGER — Image Puzzle
  // =============================================
  suite('GameManager — Puzzle Start', (t) => {
    t('starts puzzle game', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      const res = GameManager.startGame(r);
      assert(res.success); assertEqual(res.mode, 'puzzle');
      assert(r.puzzleTiles); assert(r.puzzlePlayerTiles[r.host]);
      assertEqual(r.puzzleMoves[r.host], 0);
    });
    t('each player gets same initial shuffle', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      const { playerId: bId } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      assert(r.puzzlePlayerTiles[r.host].every((t, i) => t === r.puzzlePlayerTiles[bId][i]));
    });
    t('assigns image set', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      GameManager.startGame(r);
      assert(r.puzzleImageSet); assert(r.puzzleImageSet.emojis);
    });
  });

  suite('GameManager — Puzzle Moves', (t) => {
    t('valid move works', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      GameManager.startGame(r);
      const tiles = r.puzzlePlayerTiles[r.host];
      const emptyIdx = tiles.indexOf(0);
      const neighbors = ImagePuzzle.getNeighbors(emptyIdx);
      if (neighbors.length > 0) {
        const res = GameManager.puzzleMove(r, r.host, neighbors[0]);
        assert(res.moved); assertEqual(res.moves, 1);
      }
    });
    t('invalid move rejected', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      GameManager.startGame(r);
      const tiles = r.puzzlePlayerTiles[r.host];
      const emptyIdx = tiles.indexOf(0);
      // Find a non-neighbor
      const neighbors = new Set(ImagePuzzle.getNeighbors(emptyIdx));
      const nonNeighbor = [0,1,2,3,4,5,6,7,8].find(i => i !== emptyIdx && !neighbors.has(i));
      if (nonNeighbor !== undefined) {
        assert(GameManager.puzzleMove(r, r.host, nonNeighbor).error);
      }
    });
    t('move count increments', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      GameManager.startGame(r);
      const tiles = r.puzzlePlayerTiles[r.host];
      const emptyIdx = tiles.indexOf(0);
      const n = ImagePuzzle.getNeighbors(emptyIdx);
      if (n.length >= 2) {
        GameManager.puzzleMove(r, r.host, n[0]);
        const res = GameManager.puzzleMove(r, r.host, n[0]); // move back
        // After 2 moves (if valid)
        if (!res.error) assertEqual(res.moves, 2);
      }
    });
    t('not a puzzle game error', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.puzzleMove(r, r.host, 0).error);
    });
    t('unknown player error', () => {
      const r = GameManager.createRoom('A', 'puzzle');
      GameManager.startGame(r);
      assert(GameManager.puzzleMove(r, 'fake', 0).error);
    });
  });

  // =============================================
  // GAME MANAGER — Scoring
  // =============================================
  suite('GameManager — Scoring', (t) => {
    t('sorted descending', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const { playerId: b } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      r.players[b].score = 100; r.players[r.host].score = 50;
      const s = GameManager.getScores(r);
      assertEqual(s[0].name, 'B'); assertEqual(s[0].score, 100);
    });
    t('includes all players', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.addPlayer(r, 'B'); GameManager.addPlayer(r, 'C');
      assertEqual(GameManager.getScores(r).length, 3);
    });
    t('getPlayers filters disconnected', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const { playerId: b } = GameManager.addPlayer(r, 'B');
      GameManager.removePlayer(r, b);
      assertEqual(GameManager.getPlayers(r).length, 1);
    });
  });

  // =============================================
  // MULTIPLAYER SCENARIOS
  // =============================================
  suite('Multiplayer — Full Flows', (t) => {
    t('2-player trivia full game', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const { playerId: b } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      for (let i = 0; i < r.questions.length; i++) {
        GameManager.submitAnswer(r, r.host, r.questions[i].answer);
        GameManager.submitAnswer(r, b, '__wrong__');
        if (i < r.questions.length - 1) GameManager.nextQuestion(r);
      }
      GameManager.nextQuestion(r);
      assertEqual(r.status, 'finished');
      assertEqual(GameManager.getScores(r)[0].name, 'A');
    });
    t('5-player number crunch', () => {
      const r = GameManager.createRoom('P1', 'number');
      const ids = [r.host];
      for (let i = 2; i <= 5; i++) ids.push(GameManager.addPlayer(r, 'P' + i).playerId);
      GameManager.startGame(r);
      ids.forEach(id => GameManager.submitAnswer(r, id, r.questions[0].answer));
      assert(Object.values(r.players).every(p => p.answered));
    });
    t('TTT full game to win', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      const { playerId: bId } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      const xId = Object.entries(r.tttSymbols).find(([,s]) => s === 'X')[0];
      const oId = Object.entries(r.tttSymbols).find(([,s]) => s === 'O')[0];
      GameManager.tttMove(r, xId, 0); GameManager.tttMove(r, oId, 3);
      GameManager.tttMove(r, xId, 1); GameManager.tttMove(r, oId, 4);
      GameManager.tttMove(r, xId, 2);
      assertEqual(r.status, 'finished');
      assertEqual(r.players[xId].score, 50);
    });
    t('disconnect during quiz', () => {
      const r = GameManager.createRoom('A', 'trivia');
      const { playerId: b } = GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      GameManager.removePlayer(r, b);
      const res = GameManager.submitAnswer(r, r.host, r.questions[0].answer);
      assert(res.correct);
    });
  });

  // =============================================
  // EDGE CASES
  // =============================================
  suite('Edge Cases', (t) => {
    t('MAX_PLAYERS is 5', () => assertEqual(GameManager.MAX_PLAYERS, 5));
    t('QUESTION_TIME is 15', () => assertEqual(GameManager.QUESTION_TIME, 15));
    t('GAME_TYPES has 4 entries', () => assertEqual(GameManager.GAME_TYPES.length, 4));
    t('empty name works', () => assert(GameManager.createRoom('', 'trivia').id));
    t('special chars in name', () => {
      const r = GameManager.createRoom('🎮 <b>Test</b>', 'trivia');
      assertEqual(r.players[r.host].name, '🎮 <b>Test</b>');
    });
    t('submitAnswer on ttt returns error', () => {
      const r = GameManager.createRoom('A', 'tictactoe');
      GameManager.addPlayer(r, 'B');
      GameManager.startGame(r);
      assert(GameManager.submitAnswer(r, r.host, 'x').error);
    });
    t('tttMove on quiz returns error', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.tttMove(r, r.host, 0).error);
    });
    t('puzzleMove on quiz returns error', () => {
      const r = GameManager.createRoom('A', 'trivia');
      GameManager.startGame(r);
      assert(GameManager.puzzleMove(r, r.host, 0).error);
    });
  });

  // =============================================
  // SUMMARY
  // =============================================
  const summaryEl = document.getElementById('summary');
  const total = passed + failed;
  summaryEl.className = 'summary ' + (failed === 0 ? 'all-pass' : 'has-fail');
  summaryEl.textContent = `${passed}/${total} tests passed` + (failed > 0 ? ` — ${failed} FAILED` : ' ✓ All green!');
})();

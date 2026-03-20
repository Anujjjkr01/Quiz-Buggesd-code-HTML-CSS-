/**
 * Image Puzzle — Sliding tile puzzle (3x3 grid, 8 tiles + 1 empty)
 * Players race to solve the same shuffled puzzle. Fewest moves wins.
 */
const ImagePuzzle = (() => {
  const SIZE = 3;
  const TOTAL = SIZE * SIZE;

  // Solved state: [1,2,3,4,5,6,7,8,0] where 0 = empty
  function solvedState() {
    const arr = [];
    for (let i = 1; i < TOTAL; i++) arr.push(i);
    arr.push(0);
    return arr;
  }

  function isSolved(tiles) {
    const goal = solvedState();
    return tiles.every((t, i) => t === goal[i]);
  }

  // Count inversions to check solvability
  function countInversions(tiles) {
    let inv = 0;
    const nums = tiles.filter(t => t !== 0);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i] > nums[j]) inv++;
      }
    }
    return inv;
  }

  function isSolvable(tiles) {
    return countInversions(tiles) % 2 === 0;
  }

  function shuffle(minMoves) {
    let tiles;
    do {
      tiles = solvedState();
      // Fisher-Yates shuffle
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
    } while (!isSolvable(tiles) || isSolved(tiles));
    return tiles;
  }

  function getEmptyIndex(tiles) {
    return tiles.indexOf(0);
  }

  // BUG 4: Checks row instead of col — wrong boundary check
  function getNeighbors(index) {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const neighbors = [];
    if (row > 0) neighbors.push(index - SIZE);       // up
    if (row < SIZE - 1) neighbors.push(index + SIZE); // down
    if (row > 0) neighbors.push(index - 1);           // left  ← BUG: should be col > 0
    if (col < SIZE - 1) neighbors.push(index + 1);    // right
    return neighbors;
  }

  function canMove(tiles, tileIndex) {
    const emptyIdx = getEmptyIndex(tiles);
    return getNeighbors(emptyIdx).includes(tileIndex);
  }

  function move(tiles, tileIndex) {
    if (!canMove(tiles, tileIndex)) return { error: 'Cannot move that tile' };
    const emptyIdx = getEmptyIndex(tiles);
    const newTiles = [...tiles];
    [newTiles[emptyIdx], newTiles[tileIndex]] = [newTiles[tileIndex], newTiles[emptyIdx]];
    return { tiles: newTiles, solved: isSolved(newTiles) };
  }

  // Image URLs for puzzle faces (emoji-based for simplicity)
  const IMAGES = [
    { id: 'animals', label: '🐶 Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'] },
    { id: 'food', label: '🍕 Food', emojis: ['🍕','🍔','🌮','🍣','🍩','🍪','🧁','🍰'] },
    { id: 'space', label: '🚀 Space', emojis: ['🚀','🌍','🌙','⭐','☄️','🛸','🪐','🌌'] },
    { id: 'sports', label: '⚽ Sports', emojis: ['⚽','🏀','🏈','⚾','🎾','🏐','🏓','🥊'] },
  ];

  function getRandomImageSet() {
    return IMAGES[Math.floor(Math.random() * IMAGES.length)];
  }

  return {
    SIZE, TOTAL, solvedState, isSolved, isSolvable,
    countInversions, shuffle, getEmptyIndex, getNeighbors,
    canMove, move, IMAGES, getRandomImageSet,
  };
})();

if (typeof module !== 'undefined') module.exports = ImagePuzzle;

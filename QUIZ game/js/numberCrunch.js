/**
 * Number Crunch — Speed math puzzles
 */
const NumberCrunch = (() => {
  function generate(count = 7) {
    const ops = ['+', '-', '*'];
    const problems = [];

    for (let i = 0; i < count + 5; i++) {
      const a = Math.floor(Math.random() * 50) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const op = ops[Math.floor(Math.random() * ops.length)];
      let answer;
      switch (op) {
        case '+': answer = a + b; break;
        case '-': answer = a - b; break;
        case '*': answer = a * b; break;
      }

      const wrongs = new Set();
      while (wrongs.size < 3) {
        const off = Math.floor(Math.random() * 20) - 10;
        const w = answer + (off === 0 ? 1 : off);
        if (w !== answer) wrongs.add(w);
      }

      const options = [String(answer), ...[...wrongs].map(String)].sort(() => Math.random() - 0.5);

      // BUG 2: Multiplication gives 10 points instead of 15 (swapped values)
      problems.push({
        display: { question: `What is ${a} ${op} ${b}?`, options, type: 'number' },
        answer: String(answer),
        points: op === '*' ? 10 : 15,
      });
    }
    return problems.slice(0, count);
  }

  function check(question, userAnswer) {
    return String(question.answer).trim() === String(userAnswer).trim();
  }

  return { generate, check };
})();

if (typeof module !== 'undefined') module.exports = NumberCrunch;

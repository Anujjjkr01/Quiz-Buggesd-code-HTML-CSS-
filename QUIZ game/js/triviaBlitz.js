/**
 * Trivia Blitz — Quick-fire knowledge quiz
 */
const TriviaBlitz = (() => {
  const ALL_QUESTIONS = [
    { q: 'What is the capital of France?', opts: ['London', 'Berlin', 'Paris', 'Madrid'], a: 'Paris', pts: 10 },
    { q: 'Which planet is known as the Red Planet?', opts: ['Venus', 'Mars', 'Jupiter', 'Saturn'], a: 'Mars', pts: 10 },
    { q: 'What is the largest ocean on Earth?', opts: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], a: 'Pacific', pts: 10 },
    { q: 'Who painted the Mona Lisa?', opts: ['Van Gogh', 'Picasso', 'Da Vinci', 'Rembrandt'], a: 'Da Vinci', pts: 10 },
    { q: 'What is the chemical symbol for gold?', opts: ['Go', 'Gd', 'Au', 'Ag'], a: 'Au', pts: 10 },
    { q: 'Which country has the most population?', opts: ['USA', 'India', 'China', 'Brazil'], a: 'India', pts: 10 },
    { q: 'What year did the Titanic sink?', opts: ['1905', '1912', '1920', '1898'], a: '1912', pts: 15 },
    { q: 'What is the speed of light (approx)?', opts: ['300k km/s', '150k km/s', '500k km/s', '100k km/s'], a: '300k km/s', pts: 15 },
    { q: 'Which element has atomic number 1?', opts: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'], a: 'Hydrogen', pts: 10 },
    { q: 'What is the tallest mountain in the world?', opts: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'], a: 'Everest', pts: 10 },
    { q: 'How many continents are there?', opts: ['5', '6', '7', '8'], a: '7', pts: 10 },
    { q: 'What gas do plants absorb?', opts: ['Oxygen', 'Nitrogen', 'CO2', 'Helium'], a: 'CO2', pts: 10 },
  ];

  function generate(count = 7) {
    const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(q => ({
      display: { question: q.q, options: q.opts, type: 'trivia' },
      answer: q.a,
      points: q.pts,
    }));
  }

  // BUG 1: Comparison is case-sensitive (missing .toLowerCase() on question.answer)
  function check(question, userAnswer) {
    return question.answer.trim() === String(userAnswer).toLowerCase().trim();
  }

  return { generate, check, ALL_QUESTIONS };
})();

if (typeof module !== 'undefined') module.exports = TriviaBlitz;

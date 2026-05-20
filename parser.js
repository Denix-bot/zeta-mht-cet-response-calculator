export const parseResponseSheet = (rawText) => {
  // 1. Clean the extracted PDF text
  const cleanText = rawText.replace(/\s+/g, ' ');

  const scores = {
    total: 0,
    physics: { marks: 0, correct: 0, incorrect: 0, skipped: 0, totalQs: 0 },
    chemistry: { marks: 0, correct: 0, incorrect: 0, skipped: 0, totalQs: 0 },
    math: { marks: 0, correct: 0, incorrect: 0, skipped: 0, totalQs: 0 },
    totalParsedQuestions: 0
  };

  // 2. Locate every "Correct Option" in the document
  const correctRegex = /Correct Option[^\d]*(\d+)/gi;
  const matches = [...cleanText.matchAll(correctRegex)];

  scores.totalParsedQuestions = matches.length;

  // 3. Process every question found (MHT CET format: 1-50 Phys, 51-100 Chem, 101-150 Math)
  matches.forEach((match, index) => {
    const correctId = match[1];
    const startIndex = match.index;

    let subject = 'physics';
    let weightage = 1;
    
    if (index >= 100) {
      subject = 'math';
      weightage = 2; // Math is worth 2 marks
    } else if (index >= 50) {
      subject = 'chemistry';
    }

    scores[subject].totalQs += 1;

    // 4. Isolate the text chunk for THIS specific question
    const nextMatch = matches[index + 1];
    const endIndex = nextMatch ? nextMatch.index : cleanText.length;
    const questionChunk = cleanText.slice(startIndex, endIndex);

    // 5. Look for the Candidate Response inside this chunk
    const candidateRegex = /(?:Candidate Response|Chosen Option)[^\d]*(\d+)/i;
    const candidateMatch = questionChunk.match(candidateRegex);

    if (candidateMatch) {
      const candidateId = candidateMatch[1];
      if (candidateId === correctId) {
        scores[subject].correct += 1;
        scores[subject].marks += weightage;
        scores.total += weightage;
      } else {
        scores[subject].incorrect += 1;
      }
    } else {
      scores[subject].skipped += 1;
    }
  });

  return scores;
};
// scripts/seedQuestions.js
const questions = [
  {
    question: "Which of the following is a symptom of maize streak virus?",
    type: "mcq",
    options: [
      { label: "A", value: "Yellow streaks along leaf veins" },
      { label: "B", value: "Dark brown root rot" },
      { label: "C", value: "Purple stem discoloration" },
      { label: "D", value: "White powdery coating on leaves" },
    ],
    correctAnswer: "A",
    cropCategory: "maize",
    difficulty: "easy",
    explanation: "Maize streak virus causes characteristic yellow streaks parallel to leaf veins."
  },
  // ... add more
];

await AssessmentQuestion.insertMany(questions);
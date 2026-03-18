import React from "react";

export default function QuestionNav({ questions, answers, current, onJump, showResults }) {
  function checkAnswer(q) {
    const picked = answers[q.qid];
    if (!picked) return { isAnswered: false, isCorrect: false, isWrong: false };

    if (q.type === "MULTIPLE_YES_NO") {
      if (!Array.isArray(picked)) return { isAnswered: false, isCorrect: false, isWrong: false };
      const answered = picked.some((v) => v !== null && v !== undefined);
      if (!answered) return { isAnswered: false, isCorrect: false, isWrong: false };
      const allCorrect =
        Array.isArray(q.correctAnswer) &&
        picked.length === q.correctAnswer.length &&
        q.correctAnswer.every((c, i) => picked[i] === c);
      return { isAnswered: true, isCorrect: showResults && allCorrect, isWrong: showResults && answered && !allCorrect };
    }

    if (q.type === "MULTIPLE_INPUT") {
      if (!Array.isArray(picked)) return { isAnswered: false, isCorrect: false, isWrong: false };
      const answered = picked.some((v) => v !== null && v !== undefined && v !== "");
      if (!answered) return { isAnswered: false, isCorrect: false, isWrong: false };
      const allCorrect =
        Array.isArray(q.correctAnswer) &&
        picked.length === q.correctAnswer.length &&
        q.correctAnswer.every((c, i) => (picked[i] || "").trim() === (c || "").trim());
      return { isAnswered: true, isCorrect: showResults && allCorrect, isWrong: showResults && answered && !allCorrect };
    }

    // SINGLE_CHOICE
    return {
      isAnswered: Boolean(picked),
      isCorrect: showResults && picked === q.correctAnswer,
      isWrong: showResults && picked && picked !== q.correctAnswer
    };
  }

  return (
    <div className="nav-panel">
      <div className="panel-title">Danh sách câu</div>
      <div className="question-nav">
        {questions.map((q, index) => {
          const isActive = index === current;
          const { isAnswered, isCorrect, isWrong } = checkAnswer(q);

          return (
            <button
              key={q.qid}
              type="button"
              className={`nav-item ${isActive ? "active" : ""} ${
                isAnswered ? "answered" : ""
              } ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => onJump(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

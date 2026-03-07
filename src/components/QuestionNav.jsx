import React from "react";

export default function QuestionNav({ questions, answers, current, onJump, showResults }) {
  return (
    <div className="nav-panel">
      <div className="panel-title">Danh sách câu</div>
      <div className="question-nav">
        {questions.map((q, index) => {
          const picked = answers[q.qid];
          const isActive = index === current;
          const isAnswered = Boolean(picked);
          const isCorrect = showResults && picked === q.correctAnswer;
          const isWrong = showResults && picked && picked !== q.correctAnswer;

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

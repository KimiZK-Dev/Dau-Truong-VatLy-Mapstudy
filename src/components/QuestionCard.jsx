import React from "react";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function renderHtml(html) {
  return { __html: html };
}

export default function QuestionCard({ question, selected, onSelect, showResults, disabled }) {
  const { title, stemHtml, options, correctAnswer, tags, images } = question;
  const inlineImages = [];
  const stemWithoutImages = stemHtml.replace(/<img[^>]*>/gi, (match) => {
    inlineImages.push(match);
    return "";
  });
  const optionsHaveImage = options.some((opt) => /<img\s/i.test(opt));
  const showTitle = !stemHtml || !stemHtml.trim();

  return (
    <article className="card">
      <div className="card-head">
        <div>
          {showTitle && <div className="card-title">{title}</div>}
          <div className="card-tags">
            {tags.map((tag) => (
              <span key={tag.id} className="tag">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card-content">
        <div className="stem" dangerouslySetInnerHTML={renderHtml(stemWithoutImages)} />
        {!optionsHaveImage && inlineImages.length > 0 && (
          <div className="image-grid">
            {inlineImages.map((imgTag, index) => (
              <div
                key={`inline-${index}`}
                className="image-wrap"
                dangerouslySetInnerHTML={renderHtml(imgTag)}
              />
            ))}
          </div>
        )}
        {!optionsHaveImage &&
          inlineImages.length === 0 &&
          Array.isArray(images) &&
          images.length > 0 && (
          <div className="image-grid">
            {images.map((src, index) => (
              <div key={index} className="image-wrap">
                <img
                  src={src}
                  alt={`minh hoa ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="options">
        {options.map((opt, index) => {
          const value = index + 1;
          const isSelected = selected === value;
          const isCorrect = showResults && value === correctAnswer;
          const isWrong = showResults && isSelected && !isCorrect;

          return (
            <button
              key={index}
              type="button"
              className={`option ${isSelected ? "selected" : ""} ${
                isCorrect ? "correct" : ""
              } ${isWrong ? "wrong" : ""}`}
              onClick={() => onSelect(question.qid, value)}
              aria-pressed={isSelected}
              disabled={disabled}
            >
              <span className="option-letter">{LETTERS[index]}</span>
              <span
                className="option-body"
                dangerouslySetInnerHTML={renderHtml(opt)}
              />
            </button>
          );
        })}
      </div>

      {showResults && correctAnswer && (
        <div className="answer">
          Đáp án đúng: <strong>{LETTERS[correctAnswer - 1]}</strong>
        </div>
      )}
    </article>
  );
}

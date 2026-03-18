import React, { useEffect, useRef, useState } from "react";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function renderHtml(html) {
  return { __html: html };
}

/* ─── Sub-component: MULTIPLE_YES_NO ────────────────────────────── */
function YesNoBody({ question, selected, onSelect, showResults, disabled }) {
  const { statements, correctAnswer, qid } = question;
  const picks = Array.isArray(selected) ? selected : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [qid]);

  function toggle(index, value) {
    const next = [...picks];
    while (next.length < statements.length) next.push(null);
    next[index] = value;
    onSelect(qid, next);
  }

  useEffect(() => {
    if (disabled) return;
    function onKeyDown(event) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(statements.length - 1, prev + 1));
      }
      if (event.key === "1") {
        event.preventDefault();
        toggle(activeIndex, true);
      }
      if (event.key === "2") {
        event.preventDefault();
        toggle(activeIndex, false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, disabled, statements.length]);

  return (
    <div className="yn-table">
      <div className="yn-header">
        <span className="yn-label">Phát biểu</span>
        <span className="yn-col">Đúng</span>
        <span className="yn-col">Sai</span>
      </div>
      {statements.map((stmt, i) => {
        const picked = picks[i];
        const correct = correctAnswer[i]; // true or false
        const isRowCorrect = showResults && picked === correct;
        const isRowWrong = showResults && picked !== null && picked !== undefined && picked !== correct;
        const unanswered = showResults && (picked === null || picked === undefined);

        return (
          <div
            key={i}
            className={`yn-row ${isRowCorrect ? "correct" : ""} ${isRowWrong ? "wrong" : ""} ${unanswered ? "unanswered" : ""} ${activeIndex === i ? "active" : ""}`}
            onClick={() => setActiveIndex(i)}
          >
            <span className="yn-stmt" dangerouslySetInnerHTML={renderHtml(stmt)} />
            <div className="yn-cell">
              <button
                type="button"
                className={`yn-btn ${picked === true ? "selected" : ""} ${
                  showResults && correct === true ? "answer" : ""
                } ${showResults && picked === true && correct !== true ? "wrong-pick" : ""}`}
                onClick={() => toggle(i, true)}
                disabled={disabled}
              >
                Đ
              </button>
            </div>
            <div className="yn-cell">
              <button
                type="button"
                className={`yn-btn ${picked === false ? "selected" : ""} ${
                  showResults && correct === false ? "answer" : ""
                } ${showResults && picked === false && correct !== false ? "wrong-pick" : ""}`}
                onClick={() => toggle(i, false)}
                disabled={disabled}
              >
                S
              </button>
            </div>

          </div>
        );
      })}
      {showResults && (
        <div className="yn-summary">
          {correctAnswer.map((c, i) => {
            const picked = picks[i];
            const isRight = picked === c;
            return (
              <span key={i} className={`yn-summary-item ${isRight ? "correct" : "wrong"}`}>
                {i + 1}. {c ? "Đ" : "S"}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-component: MULTIPLE_INPUT ─────────────────────────────── */
function InputBody({ question, selected, onSelect, showResults, disabled }) {
  const { correctAnswer, qid, inputCount } = question;
  const count = inputCount || correctAnswer.length || 1;
  const picks = Array.isArray(selected) ? selected : new Array(count).fill("");
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (disabled || showResults) return;
    firstInputRef.current?.focus();
  }, [qid, disabled, showResults]);

  function change(index, value) {
    const next = [...picks];
    while (next.length < count) next.push("");
    next[index] = value;
    onSelect(qid, next);
  }

  return (
    <div className="input-group">
      {Array.from({ length: count }).map((_, i) => {
        const userVal = (picks[i] || "").trim();
        const correctVal = (correctAnswer[i] || "").trim();
        const isRight = showResults && userVal === correctVal;
        const isWrong = showResults && userVal !== "" && userVal !== correctVal;

        return (
          <div key={i} className="input-row">
            {count > 1 && <label className="input-label">Ô {i + 1}:</label>}
            <input
              type="text"
              className={`input-field ${isRight ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
              value={picks[i] || ""}
              onChange={(e) => change(i, e.target.value)}
              placeholder="Nhập đáp án..."
              disabled={disabled}
              ref={i === 0 ? firstInputRef : undefined}
            />
            {showResults && (
              <div className={`input-feedback ${isRight ? "correct" : "wrong"}`}>
                {isRight ? "✓ Chính xác" : `✗ Đáp án đúng: ${correctVal}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main QuestionCard  ────────────────────────────────────────── */
export default function QuestionCard({ question, selected, onSelect, showResults, disabled }) {
  const { title, stemHtml, options, correctAnswer, tags, images, type } = question;
  const inlineImages = [];
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const stemWithoutImages = stemHtml.replace(/<img[^>]*>/gi, (match) => {
    inlineImages.push(match);
    return "";
  });
  const optionsHaveImage = options.some((opt) => /<img\s/i.test(opt));
  const showTitle = !stemHtml || !stemHtml.trim();

  function canZoomImage() {
    if (typeof document === "undefined") return false;
    const root = document.documentElement;
    return !root.classList.contains("device-mobile") && !root.classList.contains("device-tablet");
  }

  function onImageClick(event) {
    if (!canZoomImage()) return;
    const target = event.target;
    if (!target || target.tagName !== "IMG") return;
    const src = target.currentSrc || target.src;
    if (!src) return;
    event.preventDefault();
    event.stopPropagation();
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
    setLightboxSrc(src);
  }

  function zoomIn() {
    setLightboxZoom((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
  }

  function zoomOut() {
    setLightboxZoom((prev) => Math.max(1, Math.round((prev - 0.25) * 100) / 100));
  }

  function resetZoom() {
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
  }

  function onWheelZoom(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }

  useEffect(() => {
    if (!lightboxSrc) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxSrc]);

  useEffect(() => {
    function onMouseMove(event) {
      if (!dragRef.current.dragging) return;
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      setLightboxOffset({
        x: dragRef.current.baseX + dx,
        y: dragRef.current.baseY + dy
      });
    }

    function onMouseUp() {
      dragRef.current.dragging = false;
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function onImageMouseDown(event) {
    if (lightboxZoom <= 1) return;
    event.preventDefault();
    dragRef.current.dragging = true;
    setIsDragging(true);
    dragRef.current.startX = event.clientX;
    dragRef.current.startY = event.clientY;
    dragRef.current.baseX = lightboxOffset.x;
    dragRef.current.baseY = lightboxOffset.y;
  }

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
            {type !== "SINGLE_CHOICE" && (
              <span className="tag tag-type">
                {type === "MULTIPLE_YES_NO" ? "Đúng/Sai" : "Nhập đáp án"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card-content">
        <div
          className="stem"
          dangerouslySetInnerHTML={renderHtml(stemWithoutImages)}
          onClick={onImageClick}
        />
        {!optionsHaveImage && inlineImages.length > 0 && (
          <div className="image-grid" onClick={onImageClick}>
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
          <div className="image-grid" onClick={onImageClick}>
            {images.map((src, index) => (
              <div key={index} className="image-wrap">
                <img
                  src={typeof src === "string" ? src : src?.originalUrl}
                  alt={`minh hoa ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MULTIPLE_YES_NO ─────────────────────────────── */}
      {type === "MULTIPLE_YES_NO" && (
        <YesNoBody
          question={question}
          selected={selected}
          onSelect={onSelect}
          showResults={showResults}
          disabled={disabled}
        />
      )}

      {/* ── MULTIPLE_INPUT ──────────────────────────────── */}
      {type === "MULTIPLE_INPUT" && (
        <InputBody
          question={question}
          selected={selected}
          onSelect={onSelect}
          showResults={showResults}
          disabled={disabled}
        />
      )}

      {/* ── SINGLE_CHOICE (default) ─────────────────────── */}
      {type !== "MULTIPLE_YES_NO" && type !== "MULTIPLE_INPUT" && (
        <>
          {showResults && correctAnswer && (
            <div className="answer">
              Đáp án đúng: <strong>{LETTERS[correctAnswer - 1]}</strong>
            </div>
          )}

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
                    onClick={onImageClick}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}

      {lightboxSrc && (
        <div className="image-lightbox">
          <div
            className="image-lightbox-backdrop"
            onClick={() => setLightboxSrc(null)}
          />
          <div className="image-lightbox-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="image-lightbox-btn"
              onClick={zoomOut}
              aria-label="Thu nhỏ ảnh"
            >
              -
            </button>
            <button
              type="button"
              className="image-lightbox-btn"
              onClick={resetZoom}
              aria-label="Đặt lại zoom"
            >
              1:1
            </button>
            <button
              type="button"
              className="image-lightbox-btn"
              onClick={zoomIn}
              aria-label="Phóng to ảnh"
            >
              +
            </button>
            <button
              type="button"
              className="image-lightbox-close"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxSrc(null);
              }}
            >
              Đóng
            </button>
          </div>
          <div
            className={`image-lightbox-stage ${lightboxZoom > 1 ? "is-zoomed" : ""} ${
              isDragging ? "is-dragging" : ""
            }`}
          >
            <div
              className="image-lightbox-media"
              onClick={(event) => event.stopPropagation()}
              onWheel={onWheelZoom}
              onMouseDown={onImageMouseDown}
            >
              <img
                src={lightboxSrc}
                alt="Xem ảnh phóng to"
                style={{
                  transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxZoom})`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

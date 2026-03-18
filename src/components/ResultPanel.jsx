import React from "react";

export default function ResultPanel({
  total,
  totalAvailable,
  answered,
  onReset,
  limitInput,
  onLimitInputChange,
  onApplyLimit,
  elapsed,
  submitted,
  score,
  scoreOnTen
}) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
  const ratio = total ? score / total : 0;
  const resultTone = ratio >= 0.8 ? "success" : ratio >= 0.5 ? "warn" : "danger";
  const resultLabel =
    resultTone === "success"
      ? "Xuất sắc"
      : resultTone === "warn"
      ? "Cần cố gắng"
      : "Cần ôn lại";

  return (
    <div className="panel">
      <div className="panel-title">Tổng quan</div>
      <div className="panel-row">
        <span>Đã làm</span>
        <strong>
          {answered}/{total}
        </strong>
      </div>
      <div className="panel-row">
        <span>Ngân hàng</span>
        <strong>{totalAvailable || total}</strong>
      </div>
      <div className="panel-row">
        <span>Thời gian</span>
        <strong>{timeText}</strong>
      </div>
      {submitted && (
        <div className="submit-result" data-state={resultTone}>
          <div className="submit-result-head">
            <div>
              <div className="submit-result-title">Kết quả bài làm</div>
              <div className="submit-result-sub">
                {resultLabel} · {score}/{total} câu đúng
              </div>
            </div>
            <div className="submit-result-score">
              <span>Điểm</span>
              <strong>{scoreOnTen}</strong>
            </div>
          </div>
          <div className="submit-result-meta">
            <div className="submit-result-chip">
              Hoàn thành
              <strong>{Math.round(ratio * 100)}%</strong>
            </div>
            <div className="submit-result-chip">
              Thời gian
              <strong>{timeText}</strong>
            </div>
          </div>
          <div className="submit-result-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="panel-field">
        <label>
          Số câu (mặc định 40)
          <input
            type="number"
            min="1"
            placeholder="40"
            value={limitInput}
            onChange={(event) => onLimitInputChange(event.target.value)}
          />
        </label>
        <button className="ghost" onClick={onApplyLimit}>
          Áp dụng
        </button>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onReset}>
          Làm lại
        </button>
      </div>
    </div>
  );
}

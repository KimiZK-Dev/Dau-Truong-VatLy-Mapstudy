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
  score
}) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;

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
        <div className="submit-result">
          Đúng <strong>{score}</strong>/<strong>{total}</strong> câu ·{" "}
          <strong>{timeText}</strong>
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

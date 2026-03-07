import React from "react";

export default function ProgressBar({ total, answered }) {
  const percent = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">Hoàn thành {percent}%</div>
    </div>
  );
}

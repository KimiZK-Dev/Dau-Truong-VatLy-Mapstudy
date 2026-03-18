import React, { useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "./components/QuestionCard.jsx";
import QuestionNav from "./components/QuestionNav.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import { applyDeviceClasses } from "./utils/device.js";

const DATASETS = [
  { id: "khu_dau_1", label: "Khu bài làm số 1", file: "khu_dau_1.json" },
  { id: "khu_dau_2", label: "Khu bài làm số 2", file: "khu_dau_2.json" },
  { id: "khu_dau_3", label: "Khu bài làm số 3", file: "khu_dau_3.json" },
  { id: "khu_dau_4", label: "Khu bài làm số 4", file: "khu_dau_4.json" },
  { id: "khu_dau_5", label: "Khu bài làm số 5", file: "khu_dau_5.json" }
];

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYesNoStatements(html) {
  // Find all tables in the HTML
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  let tableMatch;
  let ynTableHtml = null;

  // Look for the table that contains <-Yes_No-> placeholders
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    if (/&lt;-Yes_No-&gt;|<-Yes_No->/i.test(tableMatch[0])) {
      ynTableHtml = tableMatch[0];
      break;
    }
  }

  if (!ynTableHtml) return [];

  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let first = true;
  while ((match = rowRegex.exec(ynTableHtml)) !== null) {
    if (first) { first = false; continue; } // skip header row
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(match[1])) !== null) {
      cells.push(cellMatch[1]);
    }
    if (cells.length > 0) {
      rows.push(cells[0].trim());
    }
  }
  return rows;
}

function countInputPlaceholders(html) {
  const matches = html.match(/&lt;-Input-&gt;|<-Input->/g);
  return matches ? matches.length : 1;
}

function parseQuestion(raw) {
  const content = raw.content || "";
  const type = raw.type || "SINGLE_CHOICE";
  const images = Array.isArray(raw.images) ? raw.images : [];
  const safeTitle = raw.title || "";
  const tags = Array.isArray(raw.tags) ? raw.tags : [];

  if (type === "MULTIPLE_YES_NO") {
    const correctArr = Array.isArray(raw.correctAnswer) ? raw.correctAnswer : [];
    let statements = parseYesNoStatements(content);
    // If no statements parsed but we have correctAnswer, generate placeholders
    if (statements.length === 0 && correctArr.length > 0) {
      statements = correctArr.map((_, i) => `<span style="font-size: 14px;">&nbsp;Phát biểu ${i + 1}</span>`);
    }
    // Ensure statements count matches correctAnswer count
    if (statements.length > correctArr.length && correctArr.length > 0) {
      statements = statements.slice(0, correctArr.length);
    }
    // Remove only the yes/no table from the stem (keep other tables like data/equipment)
    let stemHtml = content.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
      return /&lt;-Yes_No-&gt;|<-Yes_No->/i.test(match) ? "" : match;
    }).replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, "").trim();
    if (!stripHtml(stemHtml)) {
      stemHtml = safeTitle ? `<p>${safeTitle}</p>` : "";
    }
    // Trim correctAnswer if it has more entries than statements
    let finalCorrect = correctArr;
    if (correctArr.length > statements.length && statements.length > 0) {
      finalCorrect = correctArr.slice(0, statements.length);
    }
    return {
      id: raw.id, qid: raw.qid, title: safeTitle, stemHtml, options: [],
      correctAnswer: finalCorrect,
      tags, type, images, statements
    };
  }

  if (type === "MULTIPLE_INPUT") {
    let stemHtml = content.replace(/&lt;-Input-&gt;|<-Input->/g, "").trim();
    if (!stripHtml(stemHtml)) {
      stemHtml = safeTitle ? `<p>${safeTitle}</p>` : "";
    }
    const inputCount = countInputPlaceholders(content);
    return {
      id: raw.id, qid: raw.qid, title: safeTitle, stemHtml, options: [],
      correctAnswer: Array.isArray(raw.correctAnswer) ? raw.correctAnswer : [],
      tags, type, images, inputCount
    };
  }

  // Default: SINGLE_CHOICE
  const parts = content.split(/&lt;-Single_Answers-&gt;|<-Single_Answers->/g);
  let stemHtml = (parts[0] || "").trim();
  const optionsRaw = parts.slice(1).map((item) => item.trim());
  const fallbackOptions = Array.isArray(raw.options) ? raw.options : [];
  const merged = optionsRaw.length > 0 ? optionsRaw : fallbackOptions;
  const options = merged.filter(
    (opt) => stripHtml(opt).length > 0 || /<img\s/i.test(opt)
  );

  if (!stripHtml(stemHtml)) {
    stemHtml = safeTitle ? `<p>${safeTitle}</p>` : "";
  }

  return {
    id: raw.id, qid: raw.qid, title: safeTitle, stemHtml, options,
    correctAnswer: Number(raw.correctAnswer) || null,
    tags, type, images
  };
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function App() {
  const savedLimit = (() => {
    try {
      const raw = localStorage.getItem("quiz_limit");
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
    } catch {
      return 40;
    }
  })();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState(DATASETS[0]);
  const [limit, setLimit] = useState(savedLimit);
  const [limitInput, setLimitInput] = useState(String(savedLimit));
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const [introOpen, setIntroOpen] = useState(() => {
    try {
      return localStorage.getItem("quiz_intro_seen") !== "1";
    } catch {
      return true;
    }
  });
  const [introCountdown, setIntroCountdown] = useState(10);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    applyDeviceClasses();
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`./data/${dataset.file}`);
        if (!res.ok) throw new Error("Không thể tải dữ liệu");
        const data = await res.json();
        const parsed = data.map(parseQuestion);
        const shuffled = shuffle(parsed);
        const safeLimit =
          limit && Number(limit) > 0
            ? Math.min(Number(limit), shuffled.length)
            : shuffled.length;
        const sliced = shuffled.slice(0, safeLimit);
        if (alive) {
          setQuestions(sliced);
          setCurrent(0);
          setAnswers({});
          setShowResults(false);
          setError("");
          setTotalAvailable(parsed.length);
          setSubmitted(false);
          setStartTime(null);
          setElapsed(0);
          setHasStarted(false);
          const needIntro =
            typeof localStorage !== "undefined" &&
            localStorage.getItem("quiz_intro_seen") !== "1";
          setIntroOpen(needIntro);
          setIntroCountdown(10);
        }
      } catch (err) {
        if (alive) setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [dataset, limit]);

  useEffect(() => {
    if (!startTime || submitted || !hasStarted) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime, submitted, hasStarted]);

  useEffect(() => {
    if (!introOpen) {
      try {
        localStorage.setItem("quiz_intro_seen", "1");
      } catch {}
      return;
    }
    if (introCountdown <= 0) {
      setIntroOpen(false);
      return;
    }
    const id = setTimeout(() => {
      setIntroCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [introOpen, introCountdown]);

  const currentQuestion = questions[current];

  useEffect(() => {
    function onKeyDown(event) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.key.toLowerCase() === "r" && submitted) {
        event.preventDefault();
        resetAll();
      }
      const key = event.key.toLowerCase();
      if (key === "1" || key === "2" || key === "3" || key === "4") {
        if (!currentQuestion) return;
        if (currentQuestion.type !== "SINGLE_CHOICE") return;
        const index = Number(key);
        selectAnswer(currentQuestion.qid, index);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentQuestion, goNext, goPrev, selectAnswer]);

  useEffect(() => {
    if (!window.MathJax || !window.MathJax.typesetPromise) return;
    const timer = setTimeout(() => {
      const root = document.getElementById("root");
      if (!root) return;
      // Clear previously typeset elements to avoid double-processing
      if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear([root]);
      }
      window.MathJax.typesetPromise([root]).catch(() => {});
    }, 50);
    return () => clearTimeout(timer);
  }, [current, showResults, questions, hasStarted]);

  const total = questions.length;
  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((val) => {
      if (Array.isArray(val)) return val.some((v) => v !== null && v !== undefined && v !== "");
      return val !== null && val !== undefined;
    }).length;
  }, [answers]);

  const score = useMemo(() => {
    return questions.reduce((sum, q) => {
      const picked = answers[q.qid];
      if (!picked) return sum;

      if (q.type === "MULTIPLE_YES_NO") {
        if (!Array.isArray(picked) || !Array.isArray(q.correctAnswer)) return sum;
        if (picked.length !== q.correctAnswer.length) return sum;
        const totalParts = q.correctAnswer.length;
        if (!totalParts) return sum;
        const correctParts = q.correctAnswer.reduce(
          (count, c, i) => (picked[i] === c ? count + 1 : count),
          0
        );
        return sum + correctParts / totalParts;
      }

      if (q.type === "MULTIPLE_INPUT") {
        if (!Array.isArray(picked) || !Array.isArray(q.correctAnswer)) return sum;
        if (picked.length !== q.correctAnswer.length) return sum;
        const allCorrect = q.correctAnswer.every((c, i) => {
          const userVal = (picked[i] || "").trim();
          const correctVal = (c || "").trim();
          return userVal === correctVal;
        });
        return allCorrect ? sum + 1 : sum;
      }

      // SINGLE_CHOICE
      if (picked === q.correctAnswer) return sum + 1;
      return sum;
    }, 0);
  }, [answers, questions]);

  const scoreOnTen = useMemo(() => {
    if (!total) return 0;
    return Math.round((score / total) * 100) / 10;
  }, [score, total]);

  function selectAnswer(qid, value) {
    if (!hasStarted || submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function goPrev() {
    setCurrent((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setCurrent((prev) => Math.min(total - 1, prev + 1));
  }

  function jumpTo(index) {
    setCurrent(index);
  }

  function resetAll() {
    setAnswers({});
    setShowResults(false);
    setCurrent(0);
    setSubmitted(false);
    setStartTime(null);
    setElapsed(0);
    setHasStarted(false);
  }

  function applyLimit() {
    const parsed = Number(limitInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLimit(0);
      return;
    }
    setLimit(parsed);
    try {
      localStorage.setItem("quiz_limit", String(parsed));
    } catch {}
  }

  function submitQuiz() {
    if (submitted) return;
    setShowResults(true);
    setSubmitted(true);
  }

  function startQuiz() {
    if (hasStarted) return;
    setHasStarted(true);
    setStartTime(Date.now());
  }

  function onTouchStart(event) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event) {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      goNext();
    } else {
      goPrev();
    }
  }

  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-card">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app loading">
        <div className="loading-card error">{error}</div>
      </div>
    );
  }

  return (
    <div className={`app ${submitted ? "is-submitted" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <img src="./favicon.svg" alt="Logo" />
          </div>
          <div>
            <div className="brand-title">{dataset.label}</div>
            <div className="brand-sub">Trắc nghiệm Lý thuyết</div>
          </div>
        </div>
        <div className="stats">
          <label className="select">
            <span>Mục làm</span>
            <select
              value={dataset.id}
              onChange={(event) =>
                setDataset(
                  DATASETS.find((item) => item.id === event.target.value) ||
                    DATASETS[0]
                )
              }
            >
              {DATASETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="time-chip">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </div>
          <button
            className="primary"
            onClick={submitted ? resetAll : submitQuiz}
            disabled={!hasStarted && !submitted}
          >
            {submitted ? "Làm bài mới" : "Nộp bài"}
          </button>
        </div>
      </header>

      <ProgressBar total={total} answered={answeredCount} />

      <main className="layout">
        <section className="main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="swipe-hint">
            <span className="swipe-count">
              Câu {current + 1}/{total}
            </span>
            <span className="swipe-text swipe-only">Quẹt trái/phải để chuyển câu</span>
            <span className="swipe-text keyboard-only">
              Phím
              <span className="shortcut">←</span>
              <span className="shortcut">→</span>
              để chuyển · Trắc nghiệm
              <span className="shortcut">1</span>
              <span className="shortcut">2</span>
              <span className="shortcut">3</span>
              <span className="shortcut">4</span>
              · Đúng/Sai
              <span className="shortcut">↑</span>
              <span className="shortcut">↓</span>
              +
              <span className="shortcut">1</span>
              <span className="shortcut">2</span>
            </span>
          </div>
          {currentQuestion && hasStarted && (
            <QuestionCard
              question={currentQuestion}
              selected={answers[currentQuestion.qid]}
              onSelect={selectAnswer}
              showResults={showResults}
              disabled={!hasStarted || submitted}
            />
          )}
          {!hasStarted && (
            <div className="start-overlay start-only">
              <div className="start-box">
                <div className="start-title">Sẵn sàng bắt đầu?</div>
                <div className="start-sub">
                  Bấm để mở câu hỏi và tính thời gian làm bài.
                </div>
                <button className="primary" onClick={startQuiz}>
                  Bắt đầu làm bài
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={`side ${drawerOpen ? "open" : ""}`}>
          <ResultPanel
            total={total}
            totalAvailable={totalAvailable}
            answered={answeredCount}
            onReset={resetAll}
            limitInput={limitInput}
            onLimitInputChange={setLimitInput}
            onApplyLimit={applyLimit}
            elapsed={elapsed}
            submitted={submitted}
            score={score}
            scoreOnTen={scoreOnTen}
          />
          <QuestionNav
            questions={questions}
            answers={answers}
            current={current}
            onJump={(index) => {
              jumpTo(index);
              setDrawerOpen(false);
            }}
            showResults={showResults}
          />
        </aside>
        <div
          className={`drawer-overlay ${drawerOpen ? "open" : ""}`}
          onClick={() => setDrawerOpen(false)}
        />
      </main>

      <button className="drawer-toggle" onClick={() => setDrawerOpen((prev) => !prev)}>
        Bảng câu hỏi
      </button>

      {introOpen && (
        <div className="intro-overlay">
          <div className="intro-card">
            <div className="intro-title">Hướng dẫn nhanh</div>
            <ul className="intro-list">
              <li className="intro-mobile">Điện thoại: chạm để chọn, quẹt để chuyển câu.</li>
              <li className="intro-tablet">Tablet/iPad: chạm để chọn, quẹt để chuyển câu.</li>
              <li className="intro-desktop">
                Laptop:
                <div className="shortcut-row">
                  Chuyển câu
                  <span className="shortcut">←</span>
                  <span className="shortcut">→</span>
                </div>
                <div className="shortcut-row">
                  Trắc nghiệm
                  <span className="shortcut">1</span>
                  <span className="shortcut">2</span>
                  <span className="shortcut">3</span>
                  <span className="shortcut">4</span>
                </div>
                <div className="shortcut-row">
                  Đúng/Sai
                  <span className="shortcut">↑</span>
                  <span className="shortcut">↓</span>
                  <span className="shortcut">1</span>
                  <span className="shortcut">2</span>
                </div>
              </li>
              <li>Nộp bài để xem số câu đúng và thời gian.</li>
            </ul>
            <div className="intro-timer">
              Tự đóng sau <strong>{introCountdown}s</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

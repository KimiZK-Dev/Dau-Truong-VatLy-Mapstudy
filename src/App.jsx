import React, { useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "./components/QuestionCard.jsx";
import QuestionNav from "./components/QuestionNav.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

const DATASETS = [
  { id: "khu_dau_1", label: "Khu bài làm số 1", file: "khu_dau_1.json" },
  { id: "khu_dau_2", label: "Khu bài làm số 2", file: "khu_dau_2.json" },
  { id: "khu_dau_3", label: "Khu bài làm số 3", file: "khu_dau_3.json" },
  { id: "khu_dau_4", label: "Khu bài làm số 4", file: "khu_dau_4.json" }
];

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQuestion(raw) {
  const content = raw.content || "";
  const parts = content.split(/&lt;-Single_Answers-&gt;|<-Single_Answers->/g);
  let stemHtml = (parts[0] || "").trim();
  const optionsRaw = parts.slice(1).map((item) => item.trim());
  const fallbackOptions = Array.isArray(raw.options) ? raw.options : [];
  const merged = optionsRaw.length > 0 ? optionsRaw : fallbackOptions;
  const options = merged.filter(
    (opt) => stripHtml(opt).length > 0 || /<img\s/i.test(opt)
  );
  const images = Array.isArray(raw.images) ? raw.images : [];
  const safeTitle = raw.title || "";

  if (!stripHtml(stemHtml)) {
    stemHtml = safeTitle ? `<p>${safeTitle}</p>` : "";
  }

  return {
    id: raw.id,
    qid: raw.qid,
    title: safeTitle,
    stemHtml,
    options,
    correctAnswer: Number(raw.correctAnswer) || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    type: raw.type || "SINGLE_CHOICE",
    images
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
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState(DATASETS[0]);
  const [limit, setLimit] = useState(40);
  const [limitInput, setLimitInput] = useState("40");
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
      const key = event.key.toLowerCase();
      if (key === "1" || key === "2" || key === "3" || key === "4") {
        const index = Number(key);
        if (currentQuestion) selectAnswer(currentQuestion.qid, index);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentQuestion, goNext, goPrev, selectAnswer]);

  useEffect(() => {
    if (!window.MathJax || !window.MathJax.typesetPromise) return;
    const id = requestAnimationFrame(() => {
      window.MathJax.typesetPromise().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [current, showResults, questions, hasStarted]);

  const total = questions.length;
  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers]
  );

  const score = useMemo(() => {
    return questions.reduce((sum, q) => {
      const picked = answers[q.qid];
      if (picked && picked === q.correctAnswer) return sum + 1;
      return sum;
    }, 0);
  }, [answers, questions]);

  function selectAnswer(qid, index) {
    setAnswers((prev) => ({ ...prev, [qid]: index }));
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
  }

  function submitQuiz() {
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
    <div className="app">
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
          <button className="primary" onClick={submitQuiz}>
            Nộp bài
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
            <span className="swipe-text">Quẹt trái/phải để chuyển câu</span>
          </div>
          {currentQuestion && hasStarted && (
            <QuestionCard
              question={currentQuestion}
              selected={answers[currentQuestion.qid]}
              onSelect={selectAnswer}
              showResults={showResults}
              disabled={!hasStarted}
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
                  Chọn đáp án
                  <span className="shortcut">1</span>
                  <span className="shortcut">2</span>
                  <span className="shortcut">3</span>
                  <span className="shortcut">4</span>
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

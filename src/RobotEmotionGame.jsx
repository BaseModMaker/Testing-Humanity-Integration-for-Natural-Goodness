
import React, { useState, useRef } from "react";

const robotImage = "/assets/robot-face.png";
const publicPath = process.env.PUBLIC_URL;

// Original image dimensions
const WIDTH = 1312;
const HEIGHT = 1199;

// LED grid positioned over the robot's visor
const LED = {
  x: 278,
  y: 537,
  size: 18,
  columns: 42,
  rows: 28,
};

const EMOTIONS = ["joy", "sadness", "surprise", "anger"];
const PASS_SCORE = 65;

const key = (x, y) => `${x},${y}`;
const unpack = (k) => k.split(",").map(Number);

// Keep drawings inside the dark visor
function onVisor(col, row) {
  const x = LED.x + (col + 0.5) * LED.size;
  const y = LED.y + (row + 0.5) * LED.size;

  const dx = (x - 656) / 445;
  const dy = (y - 784) / 295;

  return dx * dx + dy * dy < 0.92;
}

// Reference shapes for emotion scoring
function makeTarget(emotion) {
  const points = [];
  const add = (x, y) => points.push(key(x, y));

  if (emotion === "joy" || emotion === "sadness") {
    for (let x = -9; x <= 9; x++) {
      const curve = Math.round(
        4 * (1 - Math.pow(Math.abs(x) / 9, 1.65))
      );

      add(
        21 + x,
        emotion === "joy" ? 18 + curve : 22 - curve
      );
    }
  }

  if (emotion === "surprise") {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      add(
        21 + Math.round(5 * Math.cos(a)),
        20 + Math.round(5 * Math.sin(a))
      );
    }
  }

  if (emotion === "anger") {
    for (let x = -8; x <= 8; x++) {
      add(21 + x, Math.abs(x) > 6 ? 21 : 20);
    }
  }

  return [...new Set(points)].map(unpack);
}

const TARGETS = Object.fromEntries(
  EMOTIONS.map((emotion) => [emotion, makeTarget(emotion)])
);

// Forgiving geometric comparison, not AI recognition
function calculateScore(drawing, emotion) {
  if (drawing.length < 3) return 0;

  const drawn = drawing.map(unpack);
  const target = TARGETS[emotion];

  const center = (points) => [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];

  const [dx, dy] = center(drawn);
  const [tx, ty] = center(target);

  // Allow some variation in the drawing position
  const aligned = drawn.map(([x, y]) => [
    x - dx + tx,
    y - dy + ty,
  ]);

  const similarity = ([x, y], points) => {
    let distance = Infinity;

    for (const [px, py] of points) {
      distance = Math.min(distance, Math.hypot(x - px, y - py));
    }

    return Math.max(0, 1 - distance / 3.2);
  };

  const coverage =
    target.reduce((sum, p) => sum + similarity(p, aligned), 0) /
    target.length;

  const precision =
    aligned.reduce((sum, p) => sum + similarity(p, target), 0) /
    aligned.length;

  return Math.round(
    Math.max(0, Math.min(100, 100 * (
      0.63 * coverage + 0.37 * precision
    )))
  );
}

function buildResult(scores) {
  const values = Object.values(scores);
  const completed = EMOTIONS.every(
    (emotion) => typeof scores[emotion] === "number"
  );

  return {
    testId: "emotion-drawing",
    scores: { ...scores },
    average: values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0,
    completed,
    passed:
      completed &&
      EMOTIONS.every((emotion) => scores[emotion] >= PASS_SCORE),
  };
}

// Icon-only emotion selection
function EmotionIcon({ emotion }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="24" cy="24" r="20" />
      {emotion === "anger" ? (
        <>
          <path d="M12 16 L20 21 M36 16 L28 21" />
          <path d="M15 33 H33" />
        </>
      ) : (
        <>
          <path d="M17 19 V21 M31 19 V21" />
          {emotion === "joy" && (
            <path d="M12 29 Q24 42 36 29" />
          )}
          {emotion === "sadness" && (
            <path d="M12 37 Q24 24 36 37" />
          )}
          {emotion === "surprise" && (
            <ellipse cx="24" cy="32" rx="5" ry="7" />
          )}
        </>
      )}
    </svg>
  );
}

export default function RobotEmotionGame({
  onScoresChange,
  onComplete,
}) {
  const [emotion, setEmotion] = useState("joy");
  const [drawings, setDrawings] = useState({});
  const [scores, setScores] = useState({});
  const [tool, setTool] = useState("draw");
  const [checkedScore, setCheckedScore] = useState(null);

  const painting = useRef(false);
  const lastPoint = useRef(null);
  const completedRef = useRef(false);

  const pixels = drawings[emotion] || [];
  const canNext = scores[emotion] >= PASS_SCORE;

  // Convert pointer position into a grid coordinate
  function pointerToCell(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;

    const col = Math.floor((x - LED.x) / LED.size);
    const row = Math.floor((y - LED.y) / LED.size);

    if (
      col < 0 ||
      row < 0 ||
      col >= LED.columns ||
      row >= LED.rows ||
      !onVisor(col, row)
    ) {
      return null;
    }

    return [col, row];
  }

  function invalidateScore() {
    setCheckedScore(null);

    if (typeof scores[emotion] === "number") {
      const updated = { ...scores };
      delete updated[emotion];

      setScores(updated);
      completedRef.current = false;
      onScoresChange?.(buildResult(updated));
    }
  }

  function paint(point) {
    if (!point) {
      lastPoint.current = null;
      return;
    }

    const [x1, y1] = lastPoint.current || point;
    const [x2, y2] = point;

    const steps = Math.max(
      Math.abs(x2 - x1),
      Math.abs(y2 - y1),
      1
    );

    const touched = [];

    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + ((x2 - x1) * i) / steps);
      const y = Math.round(y1 + ((y2 - y1) * i) / steps);

      if (onVisor(x, y)) touched.push(key(x, y));
    }

    lastPoint.current = point;

    setDrawings((previous) => {
      const current = new Set(previous[emotion] || []);

      touched.forEach((cell) => {
        if (tool === "erase") current.delete(cell);
        else current.add(cell);
      });

      return {
        ...previous,
        [emotion]: [...current],
      };
    });

    setCheckedScore(null);
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    const point = pointerToCell(event);
    if (!point) return;

    event.preventDefault();
    painting.current = true;
    lastPoint.current = null;

    event.currentTarget.setPointerCapture(event.pointerId);
    invalidateScore();
    paint(point);
  }

  function handlePointerMove(event) {
    if (!painting.current) return;

    event.preventDefault();
    paint(pointerToCell(event));
  }

  function handlePointerUp(event) {
    painting.current = false;
    lastPoint.current = null;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clearDrawing() {
    setDrawings((previous) => ({
      ...previous,
      [emotion]: [],
    }));

    invalidateScore();
  }

  function checkDrawing() {
    const score = calculateScore(pixels, emotion);

    const updated = {
      ...scores,
      [emotion]: score,
    };

    setScores(updated);
    setCheckedScore(score);

    const result = buildResult(updated);
    onScoresChange?.(result);

    if (result.passed && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(result);
    }
  }

  function selectEmotion(next) {
    setEmotion(next);
    setCheckedScore(null);
    setTool("draw");
  }

  function nextEmotion() {
    const index = EMOTIONS.indexOf(emotion);
    selectEmotion(EMOTIONS[(index + 1) % EMOTIONS.length]);
  }

  return (
    <div className="robot-game">
      <style>{`
        .robot-game {
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: sans-serif;
          color: #9dfaff;
          user-select: none;
        }

        .robot-game * {
          box-sizing: border-box;
        }

        .robot-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1312 / 1199;
        }

        .robot-stage img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          image-rendering: pixelated;
          pointer-events: none;
          -webkit-user-drag: none;
        }

        .robot-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: crosshair;
          touch-action: none;
        }

        .robot-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
        }

        .robot-emotions {
          margin-bottom: 4px;
        }

        .robot-tools {
          margin-top: -6px;
        }

        .robot-button {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border: 1px solid #50766d;
          border-radius: 12px;
          color: #b4e7df;
          background: #142c2a;
          cursor: pointer;
          font-size: 25px;
          transition: background 0.15s, border-color 0.15s;
          position: relative;
        }

        .robot-button:hover:not(:disabled) {
          background: #244b45;
        }

        .robot-button.active {
          background: #28534b;
          color: #8dfff0;
          border-color: #8dfff0;
        }

        .robot-button.done::after {
          content: "";
          position: absolute;
          top: 4px;
          right: 4px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #afffc2;
        }

        .robot-button.confirm {
          background: #a2efd8;
          color: #123e37;
        }

        .robot-button:disabled {
          opacity: 0.3;
          cursor: default;
        }

        .robot-score {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: 15px;
        }

        .robot-score span {
          width: 15px;
          height: 7px;
          border-radius: 2px;
          background: #314640;
        }

        .robot-score span.lit {
          background: #9ef9db;
          box-shadow: 0 0 8px #9ef9db;
        }

        .robot-score span.low {
          background: #f2ad7f;
          box-shadow: 0 0 8px #f2ad7f;
        }

        @media (max-width: 500px) {
          .robot-button {
            width: 42px;
            height: 42px;
            font-size: 22px;
          }

          .robot-controls {
            gap: 6px;
          }
        }
      `}</style>

      {/* Select an emotion */}
      <div
        className="robot-controls robot-emotions"
        role="group"
        aria-label="Select an emotion"
      >
        {EMOTIONS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={e}
            aria-pressed={emotion === e}
            className={[
              "robot-button",
              emotion === e ? "active" : "",
              scores[e] >= PASS_SCORE ? "done" : "",
            ].join(" ")}
            onClick={() => selectEmotion(e)}
          >
            <EmotionIcon emotion={e} />
          </button>
        ))}
      </div>

      {/* Robot image + interactive LED drawing */}
      <div className="robot-stage">
        <img
          src={publicPath + robotImage}
          alt="Pixel-art robot"
          draggable={false}
        />

        <svg
          className="robot-canvas"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label="Draw on the robot's LED visor"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <filter
              id="robot-led-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {pixels.map((pixel) => {
            const [col, row] = unpack(pixel);

            return (
              <rect
                key={pixel}
                x={LED.x + col * LED.size + 2}
                y={LED.y + row * LED.size + 2}
                width={LED.size - 4}
                height={LED.size - 4}
                rx="1"
                fill="#7ef8ff"
                filter="url(#robot-led-glow)"
                pointerEvents="none"
              />
            );
          })}
        </svg>
      </div>

      {/* Drawing controls */}
      <div
        className="robot-controls robot-tools"
        role="toolbar"
        aria-label="Drawing controls"
      >
        <button
          type="button"
          aria-label="Pencil"
          className={`robot-button ${tool === "draw" ? "active" : ""}`}
          onClick={() => setTool("draw")}
        >
          ✎
        </button>

        <button
          type="button"
          aria-label="Eraser"
          className={`robot-button ${tool === "erase" ? "active" : ""}`}
          onClick={() => setTool("erase")}
        >
          ⌫
        </button>

        <button
          type="button"
          aria-label="Clear"
          className="robot-button"
          onClick={clearDrawing}
        >
          ↺
        </button>

        <button
          type="button"
          aria-label="Check drawing"
          className="robot-button confirm"
          onClick={checkDrawing}
        >
          ✓
        </button>

        <button
          type="button"
          aria-label="Next emotion"
          className="robot-button"
          disabled={!canNext}
          onClick={nextEmotion}
        >
          →
        </button>
      </div>

      {/* Score feedback without text */}
      <div className="robot-score" aria-label="Drawing score">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={
              checkedScore !== null &&
              i < Math.round(checkedScore / 10)
                ? checkedScore >= PASS_SCORE
                  ? "lit"
                  : "lit low"
                : ""
            }
          />
        ))}
      </div>
    </div>
  );
}

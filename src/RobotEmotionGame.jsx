import GameRewardSummary from "./GameRewardSummary";

import React, { useState, useRef, useMemo } from "react";
import { GameHeader } from "./GameBars";

// Image stored in public/assets/
const robotImage = `${process.env.PUBLIC_URL || ""}/assets/robot-face.png`;
const backgroundImage = `${process.env.PUBLIC_URL || ""}/assets/emotion_background.png`;

// Original image dimensions
const WIDTH = 1330;
const HEIGHT = 1500;

// LED drawing grid in the 1330 x 1500 image coordinate system.
// Keep the grid centered on the visor: 278 + (42 * 18) / 2 = 656.
const LED = {
  x: 278,
  y: 537,
  size: 18,
  columns: 42,
  rows: 28,
};

const EMOTIONS = ["joy", "sadness", "surprise", "anger"];
const EMPTY_PIXELS = [];

const key = (x, y) => `${x},${y}`;
const unpack = (k) => k.split(",").map(Number);

// --------------------------------------------------
// DRAWING AREA
// --------------------------------------------------

// Limit drawing to the robot's dark visor
function onVisor(col, row) {
  const x = LED.x + (col + 0.5) * LED.size;
  const y = LED.y + (row + 0.5) * LED.size;

  // A conservative ellipse inside the visor prevents drawing onto the frame.
  const dx = (x - 656) / 445;
  const dy = (y - 784) / 295;
  return dx * dx + dy * dy < 0.92;
}

// --------------------------------------------------
// EMOTION REFERENCE SHAPES
// --------------------------------------------------

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
      const angle = (i / 48) * Math.PI * 2;

      add(
        21 + Math.round(5 * Math.cos(angle)),
        20 + Math.round(5 * Math.sin(angle))
      );
    }
  }

  if (emotion === "anger") {
    for (let x = -8; x <= 8; x++) {
      add(21 + x, Math.abs(x) > 6 ? 21 : 20);
    }

    // Mirror the two inward-sloping eyebrows shown in the anger icon.
    for (let step = 0; step <= 7; step++) {
      const row = 5 + Math.round(step * 4 / 7);
      add(10 + step, row);
      add(32 - step, row);
    }
  }

  return [...new Set(points)].map(unpack);
}

const TARGETS = Object.fromEntries(
  EMOTIONS.map((emotion) => [emotion, makeTarget(emotion)])
);

// --------------------------------------------------
// LIVE SCORE CALCULATION
// --------------------------------------------------

// Returns a score between 0 and 100.
// No minimum score is required.
export function calculateScore(drawing, emotion) {
  if (drawing.length === 0) return 0;

  const drawn = drawing.map(unpack);
  const target = TARGETS[emotion];

  // Calculate center of a group of pixels
  const center = (points) => [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];

  const [dx, dy] = center(drawn);
  const [tx, ty] = center(target);

  // Center the player's drawing on the reference
  // to allow freedom in drawing position.
  const aligned = drawn.map(([x, y]) => [
    x - dx + tx,
    y - dy + ty,
  ]);

  // Forgive small pixel differences, then reduce credit as the shapes diverge.
  const freehandTolerance = emotion === "anger" ? 1.5 : 0.75;
  const falloffDistance = 2;
  const similarity = ([x, y], points) => {
    let distance = Infinity;

    for (const [px, py] of points) {
      distance = Math.min(
        distance,
        Math.hypot(x - px, y - py)
      );
    }

    const excessDistance = Math.max(0, distance - freehandTolerance);
    return Math.max(0, 1 - excessDistance / falloffDistance);
  };

  // How much of the target shape has been reproduced?
  const coverage =
    target.reduce(
      (sum, point) => sum + similarity(point, aligned),
      0
    ) / target.length;

  // How closely do the drawn pixels match the target?
  const precision =
    aligned.reduce(
      (sum, point) => sum + similarity(point, target),
      0
    ) / aligned.length;

  // A high score requires both a complete shape and little stray ink.
  return Math.round(100 * coverage * precision);
}

// --------------------------------------------------
// RESULTS FOR FUTURE PASSPORT COMPONENT
// --------------------------------------------------

function buildResult(scores) {
  const values = Object.values(scores);

  const completed = EMOTIONS.every(
    (emotion) => typeof scores[emotion] === "number"
  );

  const average = values.length
    ? Math.round(
        values.reduce((a, b) => a + b, 0) / values.length
      )
    : 0;

  return {
    testId: "emotion-drawing",
    scores: { ...scores },
    average,
    completed,
    passed: completed,
  };
}

// --------------------------------------------------
// EMOTION ICONS
// --------------------------------------------------

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

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function RobotEmotionGame({
  onScoresChange,
  onComplete,
}) {
  const [emotion, setEmotion] = useState("joy");
  const [drawings, setDrawings] = useState({});
  const [scores, setScores] = useState({});
  const [tool, setTool] = useState("draw");
  const [finalResult, setFinalResult] = useState(null);

  const painting = useRef(false);
  const lastPoint = useRef(null);
  const completedRef = useRef(false);
  const pixels = drawings[emotion] || EMPTY_PIXELS;

  // -----------------------------------------------
  // LIVE SCORE
  // -----------------------------------------------

  // Recalculates automatically whenever pixels change.
  // This updates the score bar while drawing.
  const liveScore = useMemo(
    () => calculateScore(pixels, emotion),
    [pixels, emotion]
  );

  // -----------------------------------------------
  // POINTER POSITION
  // -----------------------------------------------

  function pointerToCell(event) {
    // Map screen coordinates into the SVG's actual viewBox coordinates.
    // This also accounts for letterboxing from preserveAspectRatio="meet".
    const svg = event.currentTarget;
    const transform = svg.getScreenCTM();
    if (!transform) return null;

    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    const { x, y } = pointer.matrixTransform(transform.inverse());
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

  // -----------------------------------------------
  // INVALIDATE PREVIOUSLY SAVED SCORE
  // -----------------------------------------------

  function invalidateScore() {
    if (typeof scores[emotion] === "number") {
      const updated = { ...scores };

      delete updated[emotion];

      setScores(updated);
      completedRef.current = false;

      onScoresChange?.(buildResult(updated));
    }
  }

  // -----------------------------------------------
  // PAINT PIXELS
  // -----------------------------------------------

  function paint(point) {
    if (!point) {
      lastPoint.current = null;
      return;
    }

    const [x1, y1] = lastPoint.current || point;
    const [x2, y2] = point;

    // Fill the gaps between pointer events
    const steps = Math.max(
      Math.abs(x2 - x1),
      Math.abs(y2 - y1),
      1
    );

    const touched = [];

    for (let i = 0; i <= steps; i++) {
      const x = Math.round(
        x1 + ((x2 - x1) * i) / steps
      );

      const y = Math.round(
        y1 + ((y2 - y1) * i) / steps
      );

      if (onVisor(x, y)) {
        touched.push(key(x, y));
      }
    }

    lastPoint.current = point;

    setDrawings((previous) => {
      const current = new Set(
        previous[emotion] || []
      );

      touched.forEach((cell) => {
        if (tool === "erase") {
          current.delete(cell);
        } else {
          current.add(cell);
        }
      });

      return {
        ...previous,
        [emotion]: [...current],
      };
    });
  }

  // -----------------------------------------------
  // POINTER EVENTS
  // -----------------------------------------------

  function handlePointerDown(event) {
    if (
      event.button !== undefined &&
      event.button !== 0
    ) {
      return;
    }

    const point = pointerToCell(event);

    if (!point) return;

    event.preventDefault();

    painting.current = true;
    lastPoint.current = null;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    // Editing a completed emotion invalidates its score
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

    if (
      event.currentTarget.hasPointerCapture?.(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  // -----------------------------------------------
  // CLEAR DRAWING
  // -----------------------------------------------

  function clearDrawing() {
    setDrawings((previous) => ({
      ...previous,
      [emotion]: [],
    }));

    invalidateScore();
  }

  // -----------------------------------------------
  // SELECT AN EMOTION
  // -----------------------------------------------

  function selectEmotion(next) {
    setEmotion(next);
    setTool("draw");
  }

  // -----------------------------------------------
  // SAVE SCORE AND AUTOMATICALLY ADVANCE
  // -----------------------------------------------

  function checkDrawing() {
    // A drawing is required, but no score minimum.
    if (pixels.length === 0 || finalResult) return;

    // Save the current live score
    const updated = {
      ...scores,
      [emotion]: liveScore,
    };

    setScores(updated);

    const result = buildResult(updated);

    // Send latest scores to parent
    onScoresChange?.(result);

    // Find the next emotion not yet completed
    const next = EMOTIONS.find(
      (e) => typeof updated[e] !== "number"
    );

    if (next) {
      // Automatically advance
      selectEmotion(next);
    } else {
      setFinalResult(result);
    }
  }

  function continueAssessment() {
    if (!finalResult || completedRef.current) return;
    completedRef.current = true;
    onComplete?.(finalResult);
  }

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------

  const completedCount = EMOTIONS.filter(
    (e) => typeof scores[e] === "number"
  ).length;

  return (
    <div className="robot-game">
      <style>{`
        .robot-game {
          --thing-cream: rgb(248, 236, 221);
          --thing-ink: #43483a;
          --thing-olive: #74875e;
          --thing-sage: #a3b879;
          --thing-track: #e2dfd1;
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          margin: 0;
          overflow: hidden;
          background: var(--thing-cream);
          color: var(--thing-ink);
          font-family: system-ui, Arial, sans-serif;
          user-select: none;
        }

        .robot-game * { box-sizing: border-box; }
        .robot-game button { font: inherit; }

        /* Shared GameHeader content */
        .robot-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .robot-header-heading {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .robot-test-badge {
          flex-shrink: 0;
          padding: 8px 16px;
          background: var(--thing-olive);
          color: #fffaf0;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .03em;
          white-space: nowrap;
        }
        .robot-header-divider {
          width: 1px;
          height: 34px;
          background: #9b9e8c;
          flex-shrink: 0;
        }
        .robot-title-icon {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }
        .robot-heading {
          margin: 0;
          font-size: clamp(18px, 2.1vw, 26px);
          font-weight: 700;
          letter-spacing: -.02em;
          white-space: nowrap;
        }
        .robot-header-count {
          flex-shrink: 0;
          font-size: 14px;
          font-weight: 650;
          color: #667354;
        }

        /* Background fills the scene between header and footer */
        .robot-scene {
          position: relative;
          display: flex;
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow: hidden;
          isolation: isolate;
        }
        .robot-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;

          object-fit: cover;
          object-position: center top;

          image-rendering: pixelated;
          pointer-events: none;
          z-index: -2;
        }
        .robot-background-tint {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: rgba(248, 236, 221, .15);
          pointer-events: none;
        }
        .robot-scene-content {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 390px);
          align-items: center;
          gap: clamp(16px, 4vw, 64px);
          width: min(1200px, 100%);
          height: 100%;
          min-height: 0;
          margin: 0 auto;
          padding: clamp(12px, 2vw, 28px);
        }
        .robot-figure {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 0;
          width: 100%;
          height: 100%;
        }
        /* The image and SVG use the SAME container and aspect-preserving
           fitting, so their coordinates align at every viewport size. */
        .robot-stage {
          position: relative;
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          filter: drop-shadow(0 9px 12px rgba(60, 64, 43, .12));
        }
        .robot-stage > img {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(calc(-50% - 5px));

          display: block;
          width: auto;
          height: 100%;
          max-width: none;
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

        /* Right-hand column: tools and drawing accuracy */
        .robot-sidebar {
          display: flex;
          flex-direction: column;
          align-self: center;
          gap: 14px;
          width: 100%;
          min-width: 0;
        }

        /* Cream tool card, inspired by the mockup */
        .robot-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          padding: clamp(18px, 2.5vw, 30px);
          background: rgba(248, 236, 221, .93);
          border: 1px solid #c4bda9;
          border-radius: 18px;
          box-shadow: 0 8px 30px rgba(68, 74, 54, .10);
        }
        .robot-control-label {
          margin: 0 0 12px;
          font-size: 13px;
          letter-spacing: .045em;
          text-transform: uppercase;
          font-weight: 750;
          color: #637054;
        }
        .robot-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .robot-emotions { justify-content: space-between; }
        .robot-tools { justify-content: flex-start; }
        .robot-button {
          position: relative;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 58px;
          height: 58px;
          border: 1px solid #c4bda9;
          border-radius: 12px;
          background: #fff9ee;
          color: var(--thing-ink);
          font-size: 26px;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .15s;
        }
        .robot-button:hover { background: #f0eed7; }
        .robot-button:active { transform: scale(.97); }
        .robot-button.active {
          background: #e1e6bc;
          border-color: #728c51;
          color: #4e673d;
        }
        .robot-button.done::after {
          content: "";
          position: absolute;
          top: 4px;
          right: 4px;
          width: 9px;
          height: 9px;
          background: #78a35e;
          border: 1px solid #fffaf0;
          border-radius: 50%;
        }
        .robot-panel-rule {
          width: 100%;
          height: 1px;
          background: #d6ccb9;
        }
        .robot-panel-note {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #6c705f;
        }
        .robot-emotion-name {
          color: #526b43;
          font-weight: 700;
          text-transform: capitalize;
        }

        /* Drawing accuracy now sits below the right-hand tool card */
        .robot-accuracy {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          padding: 18px 24px;
          background: rgba(248, 236, 221, .93);
          border: 1px solid #c4bda9;
          border-radius: 18px;
          box-shadow: 0 8px 30px rgba(68, 74, 54, .10);
        }
        .robot-accuracy-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .robot-accuracy-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--thing-ink);
        }
        .robot-score {
          width: 100%;
          height: 17px;
          overflow: hidden;
          border: 1px solid #c7c6b8;
          border-radius: 20px;
          background: var(--thing-track);
        }
        .robot-score-fill {
          height: 100%;
          border-radius: 20px;
          background: repeating-linear-gradient(
            to right,
            var(--thing-sage) 0 13px,
            #e0ead1 13px 15px
          );
          transition: width .12s ease-out;
        }
        .robot-score-number {
          font-size: 16px;
          font-weight: 750;
          font-variant-numeric: tabular-nums;
        }
        .robot-confirm {
          width: 100%;
          min-height: 42px;
          padding: 10px 18px;
          border: 1px solid #63784b;
          border-radius: 10px;
          color: #fffaf0;
          background: #758d61;
          font-weight: 700;
          cursor: pointer;
        }
        .robot-confirm:hover:not(:disabled) { background: #617c4c; }
        .robot-confirm:disabled { opacity: .45; cursor: default; }

        @media (max-width: 900px) {
          .robot-scene-content {
            grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
            gap: 14px;
          }
          .robot-panel { padding: 16px; gap: 14px; }
          .robot-accuracy { padding: 14px 16px; gap: 10px; }
          .robot-button { width: 48px; height: 48px; }
          .robot-controls { gap: 6px; }
          .robot-emotions { justify-content: space-between; }
        }
        @media (max-width: 620px) {
          .robot-header-content { gap: 6px; }
          .robot-header-heading { gap: 9px; }
          .robot-test-badge { padding: 6px 9px; font-size: 12px; }
          .robot-header-divider { height: 25px; }
          .robot-title-icon { display: none; }
          .robot-heading { font-size: 17px; }
          .robot-header-count { font-size: 11px; }
          .robot-scene-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px 12px;
          }
          .robot-figure { flex: 1 1 0; }
          .robot-stage { max-height: 100%; }
          .robot-sidebar {
            flex: 0 0 auto;
            gap: 8px;
            align-self: stretch;
          }
          .robot-panel {
            flex: 0 0 auto;
            gap: 9px;
            padding: 10px 12px;
            border-radius: 12px;
          }
          .robot-accuracy {
            gap: 8px;
            padding: 10px 12px;
            border-radius: 12px;
          }
          .robot-control-label { margin-bottom: 7px; font-size: 11px; }
          .robot-controls { gap: 8px; }
          .robot-emotions { justify-content: center; }
          .robot-button { width: 42px; height: 42px; }
          .robot-button svg { width: 25px; height: 25px; }
          .robot-panel-rule { display: none; }
          .robot-panel-note { display: none; }
          .robot-tools { justify-content: center; }
          .robot-accuracy-label { font-size: 12px; }
          .robot-score { height: 12px; }
          .robot-score-number { font-size: 14px; }
          .robot-confirm { min-height: 36px; padding: 7px 10px; font-size: 12px; }
        }
        @media (max-height: 650px) and (min-width: 621px) {
          .robot-panel { gap: 10px; padding: 14px; }
          .robot-button { width: 45px; height: 45px; }
          .robot-control-label { margin-bottom: 7px; }
        }
      `}</style>

      <GameHeader>
        <div className="robot-header-content">
          <div className="robot-header-heading">
            <span className="robot-test-badge">Test 2 / 4</span>
            <span className="robot-header-divider" aria-hidden="true" />
            <svg
              className="robot-title-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 5 4 4M4 20l4.5-1 11-11a2.83 2.83 0 0 0-4-4l-11 11L4 20Z" />
            </svg>
            <h1 className="robot-heading">Emotion Drawing</h1>
          </div>
          <div className="robot-header-count" aria-live="polite">
            {completedCount} / {EMOTIONS.length} completed
          </div>
        </div>
      </GameHeader>

      <main className="robot-scene">
        <img
          className="robot-background"
          src={backgroundImage}
          alt=""
          draggable={false}
        />
        <div className="robot-background-tint" />

        <div className="robot-scene-content">
          {/* Robot and LED drawing region */}
          <div className="robot-figure">
            <div className="robot-stage">
              <img
                src={robotImage}
                alt="Pixel-art robot with a drawable visor"
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
                onLostPointerCapture={() => {
                  painting.current = false;
                  lastPoint.current = null;
                }}
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
          </div>

          {/* Right-hand controls and score card */}
          <aside className="robot-sidebar">
            <section className="robot-panel" aria-label="Emotion drawing tools">
            <div>
              <p className="robot-control-label">Choose an emotion</p>
              <div className="robot-controls robot-emotions" role="group" aria-label="Select an emotion">
                {EMOTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={e}
                    title={e}
                    aria-pressed={emotion === e}
                    className={[
                      "robot-button",
                      emotion === e ? "active" : "",
                      typeof scores[e] === "number" ? "done" : "",
                    ].join(" ")}
                    onClick={() => selectEmotion(e)}
                  >
                    <EmotionIcon emotion={e} />
                  </button>
                ))}
              </div>
            </div>

            <div className="robot-panel-rule" />

            <div>
              <p className="robot-control-label">Drawing tools</p>
              <div className="robot-controls robot-tools" role="toolbar" aria-label="Drawing controls">
                <button
                  type="button"
                  aria-label="Pencil"
                  aria-pressed={tool === "draw"}
                  className={`robot-button ${tool === "draw" ? "active" : ""}`}
                  onClick={() => setTool("draw")}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m15 5 4 4M4 20l4.5-1 11-11a2.83 2.83 0 0 0-4-4l-11 11L4 20Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Eraser"
                  aria-pressed={tool === "erase"}
                  className={`robot-button ${tool === "erase" ? "active" : ""}`}
                  onClick={() => setTool("erase")}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m7 21-4-4a2 2 0 0 1 0-2.83L14.17 3a2 2 0 0 1 2.83 0L21 7a2 2 0 0 1 0 2.83L10.83 20a2 2 0 0 1-2.83 0Z" />
                    <path d="m7 11 8 8" />
                    <path d="M5 21h14" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Clear drawing"
                  title="Clear the current emotion"
                  className="robot-button"
                  onClick={clearDrawing}
                >
                  <span style={{ fontSize: "30px", lineHeight: 1 }}>
                    ↺
                  </span>
                </button>
              </div>
            </div>

            <p className="robot-panel-note">
              Draw <span className="robot-emotion-name">{emotion}</span> on the robot's visor,
              then save to continue to the next emotion.
            </p>
            </section>

            {/* Live drawing accuracy below the right-hand controls */}
            <section className="robot-accuracy" aria-label="Drawing accuracy">
              <div className="robot-accuracy-heading">
                <span className="robot-accuracy-label">Drawing accuracy</span>
                <output className="robot-score-number" aria-live="polite">
                  {liveScore}%
                </output>
              </div>
              <div
                className="robot-score"
                role="progressbar"
                aria-label={`${emotion} drawing score`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={liveScore}
              >
                <div
                  className="robot-score-fill"
                  style={{ width: `${liveScore}%` }}
                />
              </div>
              <button
                type="button"
                className="robot-confirm"
                onClick={checkDrawing}
                disabled={pixels.length === 0}
              >
                {completedCount === EMOTIONS.length - 1 &&
                typeof scores[emotion] !== "number"
                  ? "Finish"
                  : "Save & Continue"}
              </button>
            </section>
          </aside>
        </div>
      </main>
      {finalResult && (
        <GameRewardSummary
          title="Emotion test complete"
          rewards={[["Empathy", finalResult.average]]}
          onContinue={continueAssessment}
        />
      )}
    </div>
  );
}

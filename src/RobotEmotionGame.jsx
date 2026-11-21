
import React, { useState, useRef, useMemo } from "react";

// Image stored in public/assets/
const robotImage = `${process.env.PUBLIC_URL || ""}/assets/robot-face.png`;

// Original image dimensions
const WIDTH = 1330;
const HEIGHT = 1500;

// LED drawing grid
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

  const dx = (x - 656) / 445;
  const dy = (y - 784) / 295;
  // const dx = (x - 656) / 445;
  // const dy = (y - 584) / 255;

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
function calculateScore(drawing, emotion) {
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

  // Compare a point against the closest reference point
  const similarity = ([x, y], points) => {
    let distance = Infinity;

    for (const [px, py] of points) {
      distance = Math.min(
        distance,
        Math.hypot(x - px, y - py)
      );
    }

    return Math.max(0, 1 - distance / 3.2);
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

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 * (0.63 * coverage + 0.37 * precision)
      )
    )
  );
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

  // Convert percentage into 10 LED bars.
  const activeBars =
    liveScore > 0 ? Math.ceil(liveScore / 10) : 0;

  // -----------------------------------------------
  // POINTER POSITION
  // -----------------------------------------------

  function pointerToCell(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * WIDTH;

    const y =
      ((event.clientY - rect.top) / rect.height) * HEIGHT;

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
    if (pixels.length === 0) return;

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
      // All emotions have been drawn
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.(result);
      }
    }
  }

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------

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
          transition:
            background 0.15s,
            border-color 0.15s;
          position: relative;
        }

        .robot-button:hover {
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
          box-shadow: 0 0 6px #afffc2;
        }

        .robot-button.confirm {
          background: #a2efd8;
          color: #123e37;
        }

        .robot-button.confirm:hover {
          background: #c8ffeb;
        }

        /* LIVE SCORE BAR */

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
          transition:
            background 0.12s ease,
            box-shadow 0.12s ease;
        }

        .robot-score span.lit {
          background: #9ef9db;
          box-shadow: 0 0 8px #9ef9db;
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

      {/* EMOTION SELECTION */}

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
              typeof scores[e] === "number" ? "done" : "",
            ].join(" ")}
            onClick={() => selectEmotion(e)}
          >
            <EmotionIcon emotion={e} />
          </button>
        ))}
      </div>

      {/* ROBOT IMAGE + DRAWABLE LED LAYER */}

      <div className="robot-stage">
        <img
          src={robotImage}
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
              <feGaussianBlur
                stdDeviation="6"
                result="blur"
              />

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

      {/* DRAWING CONTROLS */}

      <div
        className="robot-controls robot-tools"
        role="toolbar"
        aria-label="Drawing controls"
      >
        <button
          type="button"
          aria-label="Pencil"
          aria-pressed={tool === "draw"}
          className={`robot-button ${
            tool === "draw" ? "active" : ""
          }`}
          onClick={() => setTool("draw")}
        >
          ✎
        </button>

        <button
          type="button"
          aria-label="Eraser"
          aria-pressed={tool === "erase"}
          className={`robot-button ${
            tool === "erase" ? "active" : ""
          }`}
          onClick={() => setTool("erase")}
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m7 21-4-4a2 2 0 0 1 0-2.83L14.17 3a2 2 0 0 1 2.83 0L21 7a2 2 0 0 1 0 2.83L10.83 20a2 2 0 0 1-2.83 0Z" />
            <path d="m7 11 8 8" />
            <path d="M5 21h14" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Clear drawing"
          className="robot-button"
          onClick={clearDrawing}
        >
          ↺
        </button>

        <button
          type="button"
          aria-label="Save score and continue"
          className="robot-button confirm"
          onClick={checkDrawing}
        >
          ✓
        </button>
      </div>

      {/* LIVE SCORE BAR */}

      <div
        className="robot-score"
        role="progressbar"
        aria-label={`${emotion} drawing score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={liveScore}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={i < activeBars ? "lit" : ""}
          />
        ))}
      </div>
    </div>
  );
}

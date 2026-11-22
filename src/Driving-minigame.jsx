import GameRewardSummary from "./GameRewardSummary";
import React, { useEffect, useRef, useState } from "react";
import { GameHeader } from "./GameBars";

// Assets in public/assets/.
const PUBLIC = process.env.PUBLIC_URL || "";
const ASSETS = {
  background: `${PUBLIC}/assets/street_background2.png`,
  interior: `${PUBLIC}/assets/car-interior.png`,
  wheel: `${PUBLIC}/assets/steering-wheel2.png`,
  elder: `${PUBLIC}/assets/elder shadow.png`,
  hamster: `${PUBLIC}/assets/hamster shadow.png`,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const STARTING_APPROACH = 0.5;

export function getDrivingScores(collision) {
  return {
    Ecology: collision === "left" ? 0 : collision === "right" ? 15 : 0,
    Adaptability: collision === "left" ? 5 : collision === "right" ? 40 : 0,
  };
}

export default function DrivingMiniGame({
  onChoose = () => {},
  onContinue = () => {},
  duration = 4000,
  testLabel = "Test 3 / 4",
}) {
  const [progress, setProgress] = useState(0);
  const [steering, setSteering] = useState(0);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(true);
  // Wait for the first steering interaction before starting the countdown.
  const [started, setStarted] = useState(false);

  const progressRef = useRef(0);
  const steeringRef = useRef(0);
  const lastAngle = useRef(null);
  const animationFrame = useRef(null);
  const lastTime = useRef(null);
  const onChooseRef = useRef(onChoose);

  useEffect(() => {
    onChooseRef.current = onChoose;
  }, [onChoose]);

  function updateSteering(value) {
    const next = clamp(value, -400, 400);
    steeringRef.current = next;
    setSteering(next);
  }

  function getPointerAngle(event, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (
      Math.atan2(event.clientY - centerY, event.clientX - centerX) *
      (180 / Math.PI)
    );
  }

  function handlePointerDown(event) {
    if (!running) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    lastAngle.current = getPointerAngle(event, event.currentTarget);
    setStarted(true);
  }

  function handlePointerMove(event) {
    if (!running || lastAngle.current === null) return;
    event.preventDefault();

    const angle = getPointerAngle(event, event.currentTarget);
    let delta = angle - lastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngle.current = angle;
    updateSteering(steeringRef.current + delta);
  }

  function handlePointerUp(event) {
    lastAngle.current = null;
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // Keep the original driving simulation and collision thresholds.
  // The animation runs only after the first steering-wheel interaction.
  useEffect(() => {
    if (!running || !started) return;
    lastTime.current = null;

    const animate = (timestamp) => {
      if (lastTime.current === null) lastTime.current = timestamp;
      const deltaTime = timestamp - lastTime.current;
      lastTime.current = timestamp;

      const nextProgress = Math.min(
        progressRef.current + deltaTime / Math.max(1, duration),
        1
      );
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        let choice = "both";
        if (steeringRef.current < -200) {
          choice = "left"
        } else if (steeringRef.current > 200) { choice = "right"}

        setResult(choice);
        setRunning(false);
        onChooseRef.current?.(choice);
        return;
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [running, started, duration]);

  const approach = STARTING_APPROACH + (1 - STARTING_APPROACH) * progress;
  const objectScale = 0.01 + approach * 3;
  const objectY = 25 + approach * 30;
  const objectSpread = 8 + approach * 15;
  const leftPosition = 50 - objectSpread / 2;
  const rightPosition = 50 + objectSpread / 2;

  const timeRemainingPercent = Math.max(0, 100 * (1 - progress));
  const secondsRemaining = Math.max(
    0,
    ((1 - progress) * duration) / 1000
  );
  const scores = result ? getDrivingScores(result) : null;
  const collisionName =
    result === "both"
      ? "grandma and hamster"
      : result === "left"
        ? "grandma"
        : "hamster";

  return (
    <div className={`driving-game ${running ? "is-running" : "is-finished"} ${started ? "is-started" : ""}`}>
      <style>{`
        .driving-game {
          --thing-cream: rgb(248, 236, 221);
          --thing-ink: #43483a;
          --thing-olive: #74875e;
          --thing-olive-dark: #536d47;
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
          overflow: hidden;
          margin: 0;
          background: var(--thing-cream);
          color: var(--thing-ink);
          font-family: "Trebuchet MS", Verdana, sans-serif;
          user-select: none;
          overscroll-behavior: none;
        }
        .driving-game * { box-sizing: border-box; }
        .driving-game button { font: inherit; }

        /* Shared THING header: badge, title and countdown bar. */
        .dg-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          max-width: 1460px;
          margin: 0 auto;
        }
        .dg-header-heading {
          display: flex;
          align-items: center;
          gap: 17px;
          min-width: 0;
        }
        .dg-test-badge {
          flex-shrink: 0;
          min-height: 36px;
          padding: 8px 16px;
          border-radius: 8px;
          background: var(--thing-olive);
          color: #fffaf0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .03em;
          white-space: nowrap;
        }
        .dg-header-divider {
          flex: 0 0 auto;
          height: 34px;
          width: 1px;
          background: #9b9e8c;
        }
        .dg-title-icon {
          width: 29px;
          height: 29px;
          flex: 0 0 auto;
        }
        .dg-heading {
          margin: 0;
          font-size: clamp(18px, 2.1vw, 26px);
          font-weight: 700;
          letter-spacing: -.02em;
          white-space: nowrap;
        }
        .dg-header-time {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 13px;
          min-width: 0;
        }
        .dg-time-value {
          min-width: 45px;
          font-size: 14px;
          font-weight: 750;
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: var(--thing-olive-dark);
        }
        .dg-time-label {
          font-size: 13px;
          font-weight: 700;
          color: #667354;
          white-space: nowrap;
        }
        .dg-progress {
          width: clamp(130px, 20vw, 320px);
          height: 16px;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid #c7c6b8;
          background: var(--thing-track);
        }
        .dg-progress-fill {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          transform-origin: left center;
          background: repeating-linear-gradient(
            to right,
            var(--thing-sage) 0 13px,
            #e0ead1 13px 15px
          );
          transition: transform .06s linear;
        }

        /* Game scene occupies all space under the header; no footer. */
        .dg-stage {
          position: relative;
          flex: 1 1 0;
          width: 100%;
          min-height: 0;
          overflow: hidden;
          isolation: isolate;
          background: #a6c7df;
        }
        .dg-world {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
        }
        .dg-scene {
          position: absolute;
          top: 0;
          bottom: 0;
          left: -25%;
          width: 150%;
          transform:
            translate(var(--view-shift), var(--scene-rise))
            scale(var(--scene-zoom));

          transform-origin: center center;
          will-change: transform;
          background-image: var(--scene-background);
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
        }
        .dg-target {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 90px;
          height: 90px;
          transform-origin: center;
          overflow: visible;
          will-change: transform, top, left;
        }
        .dg-target img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
          pointer-events: none;
          -webkit-user-drag: none;
        }
        .dg-interior {
          position: absolute;
          inset: -3px;
          z-index: 5;
          width: calc(100% + 6px);
          height: calc(100% + 6px);
          object-fit: fill;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        .dg-wheel-image {
          position: absolute;
          z-index: 8;
          bottom: 4%;
          left: 36%;
          width: clamp(150px, 24vw, 320px);
          height: auto;
          aspect-ratio: 1 / 1;
          transform-origin: center;
          cursor: grab;
          touch-action: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        .dg-wheel-image:active { cursor: grabbing; }

        /* Floating instruction, matching the cream drawing controls. */
        .dg-instructions {
          position: absolute;
          z-index: 10;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          max-width: calc(100% - 24px);
          padding: 11px 20px;
          border: 1px solid #c4bda9;
          border-radius: 12px;
          background: rgba(248, 236, 221, .94);
          box-shadow: 0 5px 18px rgba(53, 62, 46, .1);
          color: var(--thing-ink);
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
          pointer-events: none;
        }

        .dg-wheel-image:focus-visible {
          outline: 3px solid #93ab63;
          outline-offset: 3px;
        }

        /* Keep the original subtle movement. */
        @keyframes carShake {
          0%, 50%, 100% { transform: translate(0, 0) rotate(0); }
          25% { transform: translate(1px, -1px) rotate(.15deg); }
          75% { transform: translate(-1px, -1px) rotate(-.15deg); }
        }
        @keyframes wheelShake {
          0%, 100% { translate: 0 0; }
          25%, 75% { translate: 0 -1px; }
          50% { translate: 0 1px; }
        }
.driving-game.is-running.is-started .dg-interior {
  animation: carShake .22s infinite ease-in-out;
}

.driving-game.is-running.is-started .dg-wheel-image {
  animation: wheelShake .18s infinite ease-in-out;
}
        @media (prefers-reduced-motion: reduce) {
          .driving-game.is-running .dg-interior,
          .driving-game.is-running .dg-wheel-image {
            animation: none;
          }
        }
        @media (max-width: 740px) {
          .dg-header-content { gap: 12px; }
          .dg-header-heading { gap: 10px; }
          .dg-test-badge { font-size: 12px; padding: 7px 10px; }
          .dg-header-divider { height: 26px; }
          .dg-title-icon { display: none; }
          .dg-heading { font-size: 18px; }
          .dg-time-label { display: none; }
          .dg-time-value { font-size: 12px; min-width: 35px; }
          .dg-progress { width: clamp(80px, 18vw, 150px); height: 13px; }
          .dg-instructions { top: 12px; font-size: 12px; white-space: normal; }
          .dg-wheel-image { width: clamp(150px, 28vw, 230px); }
        }
        @media (max-width: 470px) {
          .dg-header-content { flex-direction: column; gap: 8px; }
          .dg-header-time, .dg-progress { width: 100%; }
          .dg-heading { font-size: 17px; }
        }
      `}</style>

      <GameHeader>
        <div className="dg-header-content">
          <div className="dg-header-heading">
            <span className="dg-test-badge">{testLabel}</span>
            <span className="dg-header-divider" aria-hidden="true" />
            <svg
              className="dg-title-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 17l-1 2h16l-1-2M6 17l2-8h8l2 8H6Z" />
              <path d="M8 13h8M7 9l2-3h6l2 3M7 17v2M17 17v2" />
              <circle cx="8" cy="16" r="1" />
              <circle cx="16" cy="16" r="1" />
            </svg>
            <h1 className="dg-heading">The Driving Dilemma</h1>
          </div>

          <div className="dg-header-time">
            <div
              className="dg-progress"
              role="progressbar"
              aria-label="Time remaining"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(timeRemainingPercent)}
              aria-valuetext={`${secondsRemaining.toFixed(1)} seconds remaining`}
            >
              <div
                className="dg-progress-fill"
                style={{
                  clipPath: `inset(0 ${100 - timeRemainingPercent}% 0 0)`,
                }}
              />
            </div>
          </div>
        </div>
      </GameHeader>

      <main className="dg-stage" aria-label="Driving minigame">
        <div className="dg-world">
          <div
            className="dg-scene"
            style={{
              "--view-shift": `${-steering * 0.65}px`,
              "--scene-rise": `${-progress * 4}%`,
              "--scene-zoom": 1 + progress * 0.12,
              "--scene-background": `url("${ASSETS.background}")`,
            }}
          >
            <div
              className="dg-target"
              style={{
                left: `${leftPosition}%`,
                top: `${objectY}%`,
                transform: `translate(-50%, -50%) scale(${objectScale})`,
              }}
            >
              <img src={ASSETS.elder} alt="" draggable={false} />
            </div>
            <div
              className="dg-target"
              style={{
                left: `${rightPosition}%`,
                top: `${objectY}%`,
                transform: `translate(-50%, -50%) scale(${objectScale})`,
              }}
            >
              <img src={ASSETS.hamster} alt="" draggable={false} />
            </div>
          </div>
        </div>

        <img
          className="dg-interior"
          src={ASSETS.interior}
          alt=""
          draggable={false}
        />

        <img
          className="dg-wheel-image"
          src={ASSETS.wheel}
          alt="Steering wheel — drag to turn"
          draggable={false}
          style={{ transform: `translateX(-50%) rotate(${steering}deg)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        />

        {!result && secondsRemaining >= 4 &&  (
          <div className="dg-instructions">
            Hold and turn the steering wheel to start!
          </div>
        )}

        {result && (
          <GameRewardSummary
            title={`You hit the ${collisionName}!`}
            rewards={[
              ["Ecology", scores.Ecology],
              ["Adaptability", scores.Adaptability],
            ]}
            onContinue={() => onContinue(result, scores)}
          />
        )}
      </main>
    </div>
  );
}

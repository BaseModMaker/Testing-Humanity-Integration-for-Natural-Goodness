
import React, { useEffect, useRef, useState } from "react";

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));
const interiorSrc = "/assets/car-interior.png";
const wheelSrc = "/assets/steering-wheel2.png";
const leftObject ="/assets/elder.png";
const rightObject = "/assets/child.png";
const publicPath = process.env.PUBLIC_URL;

const DrivingMiniGame = ({
  onChoose = () => {},
  duration = 6000,
}) => {
  const [progress, setProgress] = useState(0);
  const [steering, setSteering] = useState(0);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(true);

  const progressRef = useRef(0);
  const steeringRef = useRef(0);
  const lastAngle = useRef(null);
  const animationFrame = useRef(null);
  const lastTime = useRef(null);

  // Keep steering synchronized with the animation loop.
  const updateSteering = (value) => {
    const next = clamp(value, -135, 135);
    steeringRef.current = next;
    setSteering(next);
  };

  // Convert pointer position into an angle around the wheel.
  const getPointerAngle = (event, element) => {
    const rect = element.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX
    ) * (180 / Math.PI);
  };

  const handlePointerDown = (event) => {
    event.preventDefault();

    event.currentTarget.setPointerCapture(event.pointerId);

    lastAngle.current = getPointerAngle(
      event,
      event.currentTarget
    );
  };

  const handlePointerMove = (event) => {
    if (lastAngle.current === null) return;

    const angle = getPointerAngle(
      event,
      event.currentTarget
    );

    let delta = angle - lastAngle.current;

    // Prevent sudden jumps when crossing the -180/180 boundary.
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngle.current = angle;

    updateSteering(steeringRef.current + delta);
  };

  const handlePointerUp = () => {
    lastAngle.current = null;
  };

  // Game animation.
  useEffect(() => {
    if (!running) return;

    lastTime.current = null;

    const animate = (timestamp) => {
      if (lastTime.current === null) {
        lastTime.current = timestamp;
      }

      const deltaTime = timestamp - lastTime.current;
      lastTime.current = timestamp;

      const nextProgress = Math.min(
        progressRef.current + deltaTime / duration,
        1
      );

      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        const choice =
          steeringRef.current < 0 ? "left" : "right";

        setResult(choice);
        setRunning(false);
        onChoose(choice);
        return;
      }

      animationFrame.current =
        requestAnimationFrame(animate);
    };

    animationFrame.current =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame.current);
    };
  }, [running, duration]);

  // Reset and replay.
  const restart = () => {
    cancelAnimationFrame(animationFrame.current);

    progressRef.current = 0;
    steeringRef.current = 0;
    lastAngle.current = null;
    lastTime.current = null;

    setProgress(0);
    setSteering(0);
    setResult(null);
    setRunning(true);
  };

  // Calculate the perspective animation of the objects.
  // Objects grow as they approach the car
  const objectScale = 0.25 + progress * 1.75;

  // Objects move down the windscreen
  const objectY = 8 + progress * 55;

  // Distance between the objects increases over time
  const objectSpread = 8 + progress * 32;

  // Calculate each object's horizontal position
  const leftPosition = 50 - objectSpread / 2;
  const rightPosition = 50 + objectSpread / 2;

  return (
    <div className="driving-game">

      <style>{`
        /* The game world outside the windshield */
        .dg-world {
          position: absolute;
          inset: 0;
          z-index: 1;
          transform: translateX(var(--view-shift));
          will-change: transform;
        }

        /* Car interior overlay */
        .dg-interior {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 5;
          pointer-events: none;
          user-select: none;
        }

        /* Actual steering wheel image */
        .dg-wheel-image {
          position: absolute;
          width: 28%;
          height: auto;

          bottom: 3%;
          left: 25%;

          transform: translateX(-50%) rotate(0deg);
          transform-origin: center center;

          z-index: 8;
          cursor: grab;
          touch-action: none;
          user-select: none;
          -webkit-user-drag: none;
        }

        .dg-wheel-image:active {
          cursor: grabbing;
        }
        .driving-game {
          position: relative;
          width: 100%;
          height: clamp(460px, 70vh, 720px);
          min-height: 460px;
          overflow: hidden;
          background: #a6c7df;
          border-radius: 12px;
          user-select: none;
          font-family: Arial, sans-serif;
          color: white;
          isolation: isolate;
        }

        .driving-game * {
          box-sizing: border-box;
        }

        .dg-sky {
          position: absolute;
          inset: 0 0 48% 0;
          background: linear-gradient(
            #82b6dc 0%,
            #c9dfeb 100%
          );
        }

        .dg-road {
          position: absolute;
          inset: 30% 0 0 0;
          background: #484b50;
          clip-path: polygon(
            43% 0, 57% 0, 100% 100%, 0 100%
          );
        }

        .dg-road-lines {
          position: absolute;
          inset: 30% 0 0 0;
          clip-path: polygon(
            43% 0, 57% 0, 100% 100%, 0 100%
          );
          overflow: hidden;
        }

        .dg-road-lines::after {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          height: 100%;
          width: 5px;
          background: repeating-linear-gradient(
            to bottom,
            #ffffff 0px,
            #ffffff 22px,
            transparent 22px,
            transparent 44px
          );
          transform: translateX(-50%);
          opacity: 0.7;
        }

          .dg-target {
            position: absolute;
            z-index: 3;
            width: 90px;
            height: 90px;
            display: flex;
            justify-content: center;
            align-items: center;
            transform-origin: center center;
            overflow: visible;
            will-change: transform, top, left;
          }

          .dg-target img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
          }

        .dg-car {
          position: absolute;
          z-index: 5;
          bottom: 12%;
          left: 50%;
          width: 240px;
          height: 110px;
          transform: translateX(
            calc(-50% + var(--car-offset))
          );
          transition: transform 0.08s linear;
        }

        .dg-hood {
          position: absolute;
          bottom: 0;
          left: 10%;
          width: 80%;
          height: 85px;
          background: linear-gradient(
            180deg, #555c65, #242a30
          );
          clip-path: polygon(
            15% 0, 85% 0, 100% 100%, 0 100%
          );
          border-top: 4px solid #777;
        }

        .dg-dashboard {
          position: absolute;
          z-index: 6;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 18%;
          min-height: 85px;
          background: linear-gradient(
            #25282e, #111317
          );
          border-top: 5px solid #555a60;
        }

        .dg-wheel-area {
          position: absolute;
          z-index: 8;
          bottom: 3%;
          left: 50%;
          transform: translateX(-50%);
          width: 190px;
          height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dg-wheel {
          width: 145px;
          height: 145px;
          border: 13px solid #17191d;
          border-radius: 50%;
          position: relative;
          cursor: grab;
          touch-action: none;
          background: transparent;
          box-shadow:
            0 0 0 3px #62666c,
            inset 0 0 0 2px #555;
        }

        .dg-wheel:active {
          cursor: grabbing;
        }

        .dg-wheel-center {
          position: absolute;
          width: 48px;
          height: 48px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #353a40;
          border: 5px solid #17191d;
        }

        .dg-wheel-spoke {
          position: absolute;
          background: #25292e;
          border: 2px solid #666;
          transform-origin: center;
        }

        .dg-spoke-top {
          width: 12px;
          height: 49px;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
        }

        .dg-spoke-left {
          width: 48px;
          height: 11px;
          top: 65%;
          left: 2px;
          transform: rotate(25deg);
        }

        .dg-spoke-right {
          width: 48px;
          height: 11px;
          top: 65%;
          right: 2px;
          transform: rotate(-25deg);
        }

        .dg-instructions {
          position: absolute;
          z-index: 10;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 18px;
          border-radius: 8px;
          background: rgba(0,0,0,0.55);
          font-size: 14px;
          text-align: center;
          white-space: nowrap;
        }

        .dg-steering-indicator {
          position: absolute;
          z-index: 10;
          bottom: 24%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 13px;
          color: white;
          opacity: 0.8;
        }

        .dg-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: rgba(0,0,0,0.75);
          text-align: center;
        }

        .dg-overlay h2 {
          font-size: 30px;
          margin: 0;
        }

        .dg-overlay button {
          padding: 12px 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          background: white;
          color: #222;
        }

        .dg-progress {
          position: absolute;
          z-index: 10;
          top: 65px;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 5px;
          border-radius: 5px;
          background: rgba(255,255,255,0.3);
          overflow: hidden;
        }

        .dg-progress-fill {
          height: 100%;
          background: white;
          transition: width 0.05s linear;
        }

        @media (max-width: 500px) {
          .dg-car {
            width: 190px;
          }

          .dg-wheel {
            width: 125px;
            height: 125px;
          }

          .dg-wheel-area {
            bottom: 2%;
          }

          
        }
      `}</style>


      {/* Outside view: road, sky and approaching objects */}
      <div
        className="dg-world"
        style={{
          "--view-shift": `${-steering * 0.65}px`,
        }}
      >

        {/* Left approaching image */}
        <div
          className="dg-target"
          style={{
            left: `${leftPosition}%`,
            top: `${objectY}%`,
            transform: `translate(-50%, -50%) scale(${objectScale})`,
          }}
        >
          <img src={publicPath + leftObject} alt="" />
        </div>

        {/* Right approaching image */}
        <div
          className="dg-target"
          style={{
            left: `${rightPosition}%`,
            top: `${objectY}%`,
            transform: `translate(-50%, -50%) scale(${objectScale})`,
          }}
        >
          <img src={publicPath + rightObject} alt="" />
        </div>
      </div>

      {/* Transparent car interior overlay */}
      <img
        className="dg-interior"
        src={publicPath+interiorSrc}
        alt=""
        draggable="false"
      />

      {/* Steering wheel */}
      <img
        className="dg-wheel-image"
        src={publicPath+wheelSrc}
        alt="Steering wheel"
        draggable="false"
        style={{
          transform: `rotate(${steering}deg)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      />
      {/* Instructions */}
      {!result && (
        <>
          <div className="dg-instructions">
            Click and hold the wheel. Turn left or right!
          </div>

          <div className="dg-progress">
            <div
              className="dg-progress-fill"
              style={{
                width: `${progress * 100}%`,
              }}
            />
          </div>
          {/*
          <div className="dg-steering-indicator">
            Steering: {Math.round(steering)}°
          </div>
          */}
        </>
      )}

      {/* End screen */}
      {result && (
        <div className="dg-overlay">
          <h2>
            You hit the {result.toUpperCase()} object!
          </h2>

          <p>
            Steering angle: {Math.round(steering)}°
          </p>

          <button onClick={restart}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default DrivingMiniGame;

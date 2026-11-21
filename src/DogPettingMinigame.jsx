
import React, { useEffect, useRef, useState } from "react";

const dogSrc = "/assets/dog.png";
const dogLoveSrc = "/assets/dog_tongue.png";
const dogFrameSrc = "/assets/dog_frame.png";
const dogAngrySrc = "/assets/DogLockIn.png"
const publicPath = process.env.PUBLIC_URL;
const GAME_DURATION = 10000;

const DogPettingMiniGame = ({
    onContinue = () => { },
}) => {
    const [score, setScore] = useState(0);
    const [running, setRunning] = useState(true);
    const [hearts, setHearts] = useState([]);
    const [isPetting, setIsPetting] = useState(false);
    const [isPunched, setIsPunched] = useState(false);
    const [impactEmoji, setImpactEmoji] = useState(false);

    const clickTimes = useRef([]);
    const punchTimeout = useRef(null);

    const startTime = useRef(null);
    const animationFrame = useRef(null);
    const pointerDown = useRef(false);
    const previousAngle = useRef(null);
    const accumulatedAngle = useRef(0);
    const heartId = useRef(0);

    useEffect(() => {
        const animate = (timestamp) => {
            if (startTime.current === null) {
                startTime.current = timestamp;
            }

            const elapsed = timestamp - startTime.current;
            if (elapsed >= GAME_DURATION) {
                setRunning(false);
                pointerDown.current = false;
                return;
            }

            animationFrame.current =
                requestAnimationFrame(animate);
        };

        animationFrame.current =
            requestAnimationFrame(animate);

        return () => {
            if (animationFrame.current !== null) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    useEffect(() => {
        if (hearts.length === 0) return;

        const timeout = setTimeout(() => {
            setHearts((current) =>
                current.filter((heart) => Date.now() - heart.createdAt < 900)
            );
        }, 900);

        return () => clearTimeout(timeout);
    }, [hearts]);

    const getAngle = (event, element) => {
        const rect = element.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return Math.atan2(
            event.clientY - centerY,
            event.clientX - centerX
        );
    };

    const addHeart = () => {
        const id = heartId.current++;

        setHearts((current) => [
            ...current,
            {
                id,
                createdAt: Date.now(),
                left: 40 + Math.random() * 20,
            },
        ]);
    };

    const handleDogClick = () => {
        if (!running) return;

        const now = Date.now();

        clickTimes.current = clickTimes.current.filter(
            (time) => now - time < 350
        );

        clickTimes.current.push(now);

        if (clickTimes.current.length >= 3) {
            setScore((current) => current - 20);
            setIsPunched(true);
            setImpactEmoji(true);
            clickTimes.current = [];

            clearTimeout(punchTimeout.current);

            punchTimeout.current = setTimeout(() => {
                setIsPunched(false);
                setImpactEmoji(false);
            }, 500);
        }
    };

    const handlePointerDown = (event) => {
        if (!running) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        setIsPetting(true);

        pointerDown.current = true;
        previousAngle.current = getAngle(
            event,
            event.currentTarget
        );
        accumulatedAngle.current = 0;
    };

    const handlePointerMove = (event) => {
        if (!running || !pointerDown.current) return;

        const angle = getAngle(event, event.currentTarget);

        let delta = angle - previousAngle.current;

        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        previousAngle.current = angle;

        accumulatedAngle.current += Math.abs(delta);

        if (accumulatedAngle.current >= Math.PI * 2) {
            accumulatedAngle.current -= Math.PI * 2;

            setScore((current) => current + 10);
            addHeart();
        }
    };

    const stopPetting = () => {
        pointerDown.current = false;
        previousAngle.current = null;
        accumulatedAngle.current = 0;
        setIsPetting(false);
    };

    return (
        <div className="dog-game">
            <style>{`
        .dog-game {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: black;
          font-family: Arial, sans-serif;
          user-select: none;
          z-index: 9999;
        }

        .dog-game * {
          box-sizing: border-box;
        }

.dog-area {
  position: absolute;
  inset: 70px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

        .dog-image {
        width: min(75vw, 520px);
        max-height: 75%;
        object-fit: contain;

        /* Keep pixel art crisp when enlarged */
        image-rendering: pixelated;
        image-rendering: crisp-edges;

        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        }

        .pet-area {
          position: absolute;
          width: min(48vw, 270px);
          height: min(48vw, 270px);
          max-height: 40vh;
          border-radius: 50%;
          left: 50%;
          top: 43%;
          transform: translate(-50%, -50%);
          cursor: grab;
          touch-action: none;
          z-index: 3;
        }

        .pet-area:active {
          cursor: grabbing;
        }

        .heart {
          position: absolute;
          left: var(--heart-left);
          top: 40%;
          font-size: 32px;
          pointer-events: none;
          animation: heartFloat 0.9s ease-out forwards;
          z-index: 6;
        }

        @keyframes heartFloat {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.5);
          }
          100% {
            opacity: 0;
            transform: translateY(-110px) scale(1.4);
          }
        }

        .dog-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.65);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 18px;
          color: white;
          z-index: 10;
          text-align: center;
        }

        .dog-overlay h2 {
          font-size: 34px;
          margin: 0;
        }

        .dog-overlay p {
          font-size: 24px;
          margin: 0;
        }

        .dog-overlay button {
          padding: 13px 30px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
        }
        .dog-frame {
            position: absolute;
            width: min(75vw, 520px);
            max-height: 75%;
            object-fit: contain;
            pointer-events: none;
            z-index: 4;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        .dog-image {
        transition: transform 0.1s;
        }

        .dog-image.punched {
        animation: dogPunch 0.25s ease;
        }

        @keyframes dogPunch {
        0% {
            transform: rotate(0deg) scale(1);
        }
        30% {
            transform: rotate(-8deg) scale(0.9);
        }
        60% {
            transform: rotate(8deg) scale(1.05);
        }
        100% {
            transform: rotate(0deg) scale(1);
        }
        }

.dog-container {
  position: relative;
  width: min(75vw, 520px);
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dog stays inside the frame */
.dog-image-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}


.dog-image.punched {
  animation: dogPunch 0.3s ease;
}

@keyframes dogPunch {
  0% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(5px, -3px) scale(0.94);
  }
  50% {
    transform: translate(-5px, 2px) scale(0.97);
  }
  75% {
    transform: translate(3px, -1px) scale(0.99);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

.impact-emoji {
  position: absolute;
  top: 12%;
  right: 12%;
  font-size: clamp(32px, 6vw, 64px);
  z-index: 6;
  pointer-events: none;
  animation: impactPop 0.5s ease-out forwards;
}

@keyframes impactPop {
  0% {
    opacity: 0;
    transform: scale(0.2) rotate(-30deg);
  }
  35% {
    opacity: 1;
    transform: scale(1.4) rotate(15deg);
  }
  70% {
    opacity: 1;
    transform: scale(1) rotate(-10deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.7) rotate(0deg);
  }
}
        @media (max-width: 500px) {
          .dog-image {
            width: 90vw;
            max-height: 65%;
          }

          .dog-hint {
            font-size: 14px;
          }
        }
      `}</style>

            <div className="dog-area">
                <div className="dog-container">
                    <div className="dog-image-clip">
                        <img
                            key={isPunched ? "angry" : isPetting ? "petting" : "normal"}
                            className={`dog-image ${isPunched ? "punched" : ""}`}
                            src={
                                publicPath +
                                (isPunched
                                    ? dogAngrySrc
                                    : isPetting
                                        ? dogLoveSrc
                                        : dogSrc)
                            }
                            alt="Dog"
                            draggable="false"
                        />
                    </div>

                    <img
                        className="dog-frame"
                        src={publicPath + dogFrameSrc}
                        alt=""
                    />

                    {impactEmoji && (
                        <div className="impact-emoji">
                            💢
                        </div>
                    )}
                </div>

                <div
                    className="pet-area"
                    onClick={handleDogClick}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopPetting}
                    onPointerCancel={stopPetting}
                    onLostPointerCapture={stopPetting}
                />

                {hearts.map((heart) => (
                    <div
                        key={heart.id}
                        className="heart"
                        style={{
                            "--heart-left": `${heart.left}%`,
                        }}
                    >
                        ❤️
                    </div>
                ))}
            </div>

            {!running && (
                <div className="dog-overlay">
                    <button onClick={() => onContinue(score)}>
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
};

export default DogPettingMiniGame;

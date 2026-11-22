import UmbrellaDilemma from "./UmbrellaDilemma";
import RobotEmotionGame from "./RobotEmotionGame";
import DrivingMiniGame from "./Driving-minigame";
import DogPettingMiniGame from "./DogPettingMinigame";
import { useEffect, useState } from "react";
import "./App.css";

function TitleScreen() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        backgroundImage: `url("${process.env.PUBLIC_URL}/assets/thing_background.png")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "5dvh",
          right: "min(220px, 45vw)",
          width: "min(200px, 45vw)",
          zIndex: 10,
        }}
      >
        {/* Shadow */}
        <img
          src={`${process.env.PUBLIC_URL}/assets/shadow.png`}
          alt="shadow"
          style={{
            position: "absolute",
            bottom: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            opacity: 0.8,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Robot */}
        <img
          src={`${process.env.PUBLIC_URL}/assets/Robot Sprite 2.png`}
          alt="robot"
          style={{
            position: "relative",
            width: "100%",
            height: "auto",
            display: "block",
            zIndex: 1,
          }}
        />
      </div>

      <div
        style={{
          width: "60vw",
          alignSelf: "center",
          position: "relative",
          isolation: "isolate",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-40%",
            zIndex: -1,
            pointerEvents: "none",
            background: `radial-gradient(
              ellipse at center,
              rgba(255,255,255,1) 0%,
              rgba(255,255,255,0.95) 15%,
              rgba(255,255,255,0.6) 30%,
              rgba(255,255,255,0.15) 50%,
              rgba(255,255,255,0) 70%
            )`,
            width: '50vw',
            height: '50vw',
            margin: 'auto'
          }}
        />
        <h1 style={{ margin: "0 0 1rem" }}>
          <img
            src={`${process.env.PUBLIC_URL}/assets/home_logo.png`}
            alt="T.H.I.N.G"
            style={{
              display: "block",
              width: "min(80%, 700px)",
              height: "auto",
              margin: "0 auto",
              imageRendering: "pixelated",
            }}
          />
        </h1>
        <p className="title-subtitle">
          Testing Humanity Integration<br />
          for Natural Goodness
        </p>
        <a className="portal-link" href="#/assessments">Open assessment portal</a>
      </div>
    </main>
  );
}

const assessmentFields = [
  "Preservation",
  "Empathy",
  "Ecology",
  "Cooperation",
  "Adaptability",
];

const minimumStatistic = 30;
const minimumAverage = 60;

export function getAssessmentOutcome(scores) {
  const values = assessmentFields.map((field) => scores[field] ?? 0);
  const average = values.reduce((total, score) => total + score, 0) / values.length;
  return {
    average,
    passed: average >= minimumAverage && values.every((score) => score >= minimumStatistic),
  };
}

function radarPoint(index, radius) {
  const angle = index * 2 * Math.PI / assessmentFields.length - Math.PI / 2;
  return [175 + Math.cos(angle) * radius, 123 + Math.sin(angle) * radius];
}

function AssessmentRadar({ scores }) {
  const values = assessmentFields.map((field) => scores[field]);
  const hasAllScores = values.every((value) => typeof value === "number");
  const radiusPerPoint = 0.90;
  const outerRadius = 100 * radiusPerPoint;

  return (
    <figure className="passport-radar">
      <svg viewBox="0 0 350 212" role="img" aria-labelledby="radar-description">
        <title id="radar-description">
          {assessmentFields.map((field, index) => (
            `${field}: ${values[index] ?? "not assessed"}${values[index] == null ? "" : " out of 100"}`
          )).join(". ")}
        </title>
        {[25, 50, 75, 100].map((level) => (
          <polygon
            key={level}
            className="radar-grid"
            points={assessmentFields.map((_, index) => radarPoint(index, level * radiusPerPoint).join(",")).join(" ")}
          />
        ))}
        {hasAllScores && (
          <polygon className="radar-score" points={values.map((value, index) => (
            radarPoint(index, value * radiusPerPoint).join(",")
          )).join(" ")} />
        )}
        {assessmentFields.map((field, index) => {
          const [x, y] = radarPoint(index, outerRadius);
          const [labelX, labelY] = radarPoint(index, outerRadius + 11);
          const value = values[index];
          const [scoreX, scoreY] = radarPoint(index, (value ?? 0) * radiusPerPoint);
          return (
            <g key={field}>
              {field === "Ecology" && <title>Cat shelter points plus 80 for sparing the cat while driving, capped at 100</title>}
              <line className="radar-grid" x1="175" y1="123" x2={x} y2={y} />
              {value != null && <circle className="radar-score" cx={scoreX} cy={scoreY} r="4" />}
              <text x={labelX} y={labelY - 4} textAnchor={index === 0 ? "middle" : index < 3 ? "start" : "end"}>
                <tspan x={labelX}>{field}</tspan>
                {value != null && <tspan x={labelX} dy="16">{value}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const passportFields = [
  ["model", "Model"],
  ["serialNumber", "Serial No."],
  ["parentCompany", "Company"],
  ["productionYear", "Prod. Year", "numeric"],
];

function MainScreen({ scores, passport, updatePassport, completed, startAssessment }) {
  const outcome = completed ? getAssessmentOutcome(scores) : null;

  return (
    <main
      className="assessment-home"
      aria-label="Assessments"
      style={{
        backgroundImage: `url("${process.env.PUBLIC_URL}/assets/empty_passport.png")`,
      }}
    >
      <div className="passport-spread">
        <section className="passport-page passport-identity-page" aria-labelledby="passport-title">
          <header className="passport-page-header">
            <h1 id="passport-title" className="passport-logo">
              <img src={`${process.env.PUBLIC_URL}/assets/home_logo.png`} alt="T.H.I.N.G." />
            </h1>
          </header>
      <div className="passport-photo">
        <img
          src={`${process.env.PUBLIC_URL}/assets/Robot%20Sprite%201.png`}
          alt="Smiling robot with a green sprout"
        />
      </div>
      <dl className="passport-details" aria-label="Robot information">
        {passportFields.map(([field, label, inputMode]) => (
          <div key={field}>
            <dt><label htmlFor={`passport-${field}`}>{label}:</label></dt>
            <dd>
              <input
                id={`passport-${field}`}
                type="text"
                inputMode={inputMode}
                value={passport[field] ?? ""}
                onChange={(event) => updatePassport(field, event.target.value)}
              />
            </dd>
          </div>
        ))}
      </dl>
        </section>
        <section className="passport-page passport-review-page" aria-labelledby="passport-assessment-title">
          <header className="passport-page-header passport-review-header">
            <h2 id="passport-assessment-title">Assessment record</h2>
          </header>
      <AssessmentRadar scores={scores} />
      <div className="passport-result">
        <p className="passport-result-label">Passport validation</p>
        {outcome && (
          <div
            className="assessment-outcome"
            role="status"
            title={`Passing requires at least ${minimumStatistic} in every statistic and an average of ${minimumAverage} or higher.`}
          >
            <strong className={`passport-stamp${outcome.passed ? "" : " passport-stamp-failed"}`}>
              {outcome.passed ? "Validated" : "Refused"}
            </strong>
            <span>Average {outcome.average.toFixed(1)}/100</span>
          </div>
        )}
      </div>
        </section>
      </div>
      <a className="portal-link" href="#/assessments/umbrella" onClick={startAssessment}>
        Start assessment
      </a>
    </main>
  );
}


export default function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  const [scores, setScores] = useState({});
  const [umbrellaScores, setUmbrellaScores] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [passport, setPassport] = useState({
    model: "BeepBoop-VPro-Max",
    serialNumber: "404",
    parentCompany: "Robot Inc.",
    productionYear: "2027",
  });

  function updatePassport(field, value) {
    setPassport((previous) => ({ ...previous, [field]: value }));
  }

  function startAssessment() {
    setScores({});
    setUmbrellaScores(null);
    setCompleted(false);
  }

  function finishGame(nextRoute, results) {
    const updatedScores = Object.fromEntries(
      Object.entries(results).map(([field, score]) => [
        field,
        Math.max(0, Math.min(100, score)),
      ])
    );
    setScores((previous) => ({ ...previous, ...updatedScores }));
    window.location.hash = nextRoute;
  }

  useEffect(() => {
    function updateRoute() {
      setRoute(window.location.hash);
    }

    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  switch (route) {
    case "#/assessments":
      return (
        <MainScreen
          scores={scores}
          passport={passport}
          updatePassport={updatePassport}
          completed={completed}
          startAssessment={startAssessment}
        />
      );

    case "#/assessments/umbrella":
      return (
        <main>
          <a href="#/assessments">Back to assessments</a>
          <UmbrellaDilemma onComplete={(result) => {
            setUmbrellaScores(result.scores);
            finishGame("#/assessments/emotion", {
              Preservation: result.scores.rainProtection,
              Empathy: result.scores.empathy,
              Ecology: result.scores.ecology,
            });
          }} />
        </main>
      );

    case "#/assessments/emotion":
      return <RobotEmotionGame onComplete={({ average }) => {
        finishGame("#/assessments/driving", { Empathy: average + (umbrellaScores?.empathy ?? 0) });
      }} />;

    case "#/assessments/driving":
      return <DrivingMiniGame onContinue={(_, drivingScores) => {
        finishGame("#/assessments/dog-petting", {
          ...drivingScores,
          Ecology: (umbrellaScores?.ecology ?? 0) + drivingScores.Ecology,
        });
      }} />;

    case "#/assessments/dog-petting":
      return <DogPettingMiniGame onContinue={(score) => {
        setCompleted(true);
        finishGame("#/assessments", { Cooperation: score });
      }} />;

    default:
      return <TitleScreen />;
  }
}

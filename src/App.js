import UmbrellaDilemma from "./UmbrellaDilemma";
import { useEffect, useState } from "react";
import "./App.css";

function TitleScreen() {
  return (
    <main
      style={{
        minHeight: "100vh",
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
          bottom: "150px",
          right: "220px",
          width: "200px",
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
        <p className="title-subtitle">Testing Humanity Integration for Natural Goodness</p>
        <a className="title-portal-link" href="#/assessments">Open assessment portal</a>
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

function radarPoint(index, radius) {
  const angle = index * 2 * Math.PI / assessmentFields.length - Math.PI / 2;
  return [175 + Math.cos(angle) * radius, 123 + Math.sin(angle) * radius];
}

function AssessmentRadar({ scores }) {
  const values = assessmentFields.map((field) => scores[field]);
  const hasAllScores = values.every((value) => typeof value === "number");

  return (
    <figure className="passport-radar">
      <figcaption>Statistics</figcaption>
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
            points={assessmentFields.map((_, index) => radarPoint(index, level * 0.7).join(",")).join(" ")}
          />
        ))}
        {hasAllScores && (
          <polygon className="radar-score" points={values.map((value, index) => (
            radarPoint(index, value * 0.7).join(",")
          )).join(" ")} />
        )}
        {assessmentFields.map((field, index) => {
          const [x, y] = radarPoint(index, 70);
          const [labelX, labelY] = radarPoint(index, 81);
          const value = values[index];
          const [scoreX, scoreY] = radarPoint(index, (value ?? 0) * 0.7);
          return (
            <g key={field}>
              <line className="radar-grid" x1="175" y1="123" x2={x} y2={y} />
              {value != null && <circle className="radar-score" cx={scoreX} cy={scoreY} r="4" />}
              <text x={labelX} y={labelY - 4} textAnchor={index === 0 ? "middle" : index < 3 ? "start" : "end"}>
                <tspan x={labelX}>{field}</tspan>
                <tspan x={labelX} dy="16">{value ?? "—"}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const passportFields = [
  ["model", "Model", ["Optimus", "Atlas", "EVE"]],
  ["serialNumber", "Serial No.", ["SN-01-0851", "SN-10-0851", "SN-11-4757"]],
  ["parentCompany", "Company", ["Tesla", "OpenAI", "Nvidia"]],
  ["productionYear", "Prod. Year", ["2024", "2027", "2028"]],
];

function MainScreen({ scores }) {
  const [passport, setPassport] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("robot-passport")) ?? {};
    } catch {
      return {};
    }
  });

  function updatePassport(field, value) {
    const updatedPassport = { ...passport, [field]: value };
    setPassport(updatedPassport);
    try {
      window.localStorage.setItem("robot-passport", JSON.stringify(updatedPassport));
    } catch {
      // The fields remain editable when browser storage is unavailable.
    }
  }

  return (
    <main
      className="assessment-home"
      aria-label="Assessments"
      style={{
        backgroundImage: `url("${process.env.PUBLIC_URL}/assets/empty_passport.png")`,
      }}
    >
      <div className="passport-photo">
        <img
          src={`${process.env.PUBLIC_URL}/assets/Robot%20Sprite%201.png`}
          alt="Smiling robot with a green sprout"
        />
      </div>
      <dl className="passport-details" aria-label="Robot information">
        {passportFields.map(([field, label, options]) => (
          <div key={field}>
            <dt><label htmlFor={`passport-${field}`}>{label}:</label></dt>
            <dd>
              <select
                id={`passport-${field}`}
                value={passport[field] ?? ""}
                onChange={(event) => updatePassport(field, event.target.value)}
              >
                <option value="">—</option>
                {passport[field] && !options.includes(passport[field]) && (
                  <option value={passport[field]}>{passport[field]}</option>
                )}
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </dd>
          </div>
        ))}
      </dl>
      <AssessmentRadar scores={scores} />
      <a className="portal-link" href="#/assessments/umbrella">
        Start assessment
      </a>
    </main>
  );
}


export default function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  const [scores, setScores] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("robot-assessment-scores")) ?? {};
    } catch {
      return {};
    }
  });

  function updateStatistic(field, finalScore) {
    if (!assessmentFields.includes(field) || !Number.isFinite(finalScore)) {
      return;
    }

    const score = Math.max(0, Math.min(100, finalScore));
    setScores((previous) => ({ ...previous, [field]: score }));
  }

  useEffect(() => {
    try {
      window.localStorage.setItem("robot-assessment-scores", JSON.stringify(scores));
    } catch {
      // Scores remain available in memory when browser storage is unavailable.
    }
  }, [scores]);

  useEffect(() => {
    function updateRoute() {
      setRoute(window.location.hash);
    }

    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  switch (route) {
    case "#/assessments":
      return <MainScreen scores={scores} />;

    case "#/assessments/umbrella":
      return (
        <main>
          <a href="#/assessments">Back to assessments</a>
          <UmbrellaDilemma onComplete={(result) => {
            updateStatistic("Preservation", result.scores.rainProtection);
          }} />
        </main>
      );

    default:
      return <TitleScreen />;
  }
}

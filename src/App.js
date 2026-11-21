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
      <a className="portal-link" href="#/assessments">Open assessment portal</a>
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

function MainScreen({ scores }) {
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
        {["Model", "Serial Number", "Parent Company", "Prod. Year"].map((label) => (
          <div key={label}>
            <dt>{label}:</dt>
            <dd aria-label="Blank" />
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
  const [scores, setScores] = useState({});

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
            setScores((previous) => ({ ...previous, Preservation: result.scores.rainProtection }));
          }} />
        </main>
      );

    default:
      return <TitleScreen />;
  }
}

import RobotEmotionGame from "./RobotEmotionGame";

export default function App() {
  return (
    <RobotEmotionGame
      onScoresChange={(result) => {
        console.log("Current scores:", result);
      }}
      onComplete={(result) => {
        console.log("Final result:", result);
      }}
    />
  );
}
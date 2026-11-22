import { useEffect, useId, useRef } from "react";
import "./GameRewardSummary.css";

export default function GameRewardSummary({ title, rewards, onContinue }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="game-reward-summary"
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
    >
      <div className="game-reward-check" aria-hidden="true">✓</div>
      <h2 id={titleId}>{title}</h2>
      <dl className="game-reward-scores">
        {rewards.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onContinue}>Continue</button>
    </dialog>
  );
}

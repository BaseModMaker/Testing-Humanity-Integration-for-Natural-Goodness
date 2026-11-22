import { act, fireEvent, render, screen } from "@testing-library/react";
import DrivingMiniGame from "./Driving-minigame";

jest.mock("./GameRewardSummary", () => ({ title }) => <h2>{title}</h2>);

test("shows the fallen targets before the crash summary", () => {
  jest.useFakeTimers();
  const onChoose = jest.fn();
  try {
    const { container, unmount } = render(
      <DrivingMiniGame duration={100} onChoose={onChoose} />
    );
    const wheel = screen.getByAltText(/steering wheel/i);
    wheel.setPointerCapture = jest.fn();
    fireEvent.pointerDown(wheel);

    act(() => jest.advanceTimersByTime(160));
    expect(onChoose).toHaveBeenCalledWith("both");
    expect(container.querySelectorAll(".dg-target.is-hit")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: /you hit/i })).toBeNull();

    act(() => jest.advanceTimersByTime(700));
    expect(screen.getByRole("heading", {
      name: "Oh no! You hit grandma and the hamster",
    })).toBeInTheDocument();
    unmount();
  } finally {
    jest.useRealTimers();
  }
});

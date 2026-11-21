import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./UmbrellaDilemma', () => ({ onComplete }) => (
  <button onClick={() => onComplete({ scores: { rainProtection: 75 } })}>
    Finish umbrella
  </button>
));

jest.mock('./RobotEmotionGame', () => ({ onComplete }) => (
  <button onClick={() => onComplete({ average: 82 })}>Finish emotions</button>
));

test('runs the games in order and saves their scores to the passport', async () => {
  window.localStorage.clear();
  window.location.hash = '#/assessments';
  let nextFrame;
  const requestFrame = jest.spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });

  try {
    render(<App />);
    const start = screen.getByRole('link', { name: 'Start assessment' });
    fireEvent.click(start);
    fireEvent.click(await screen.findByRole('button', { name: 'Finish umbrella' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish emotions' }));

    await screen.findByAltText(/steering wheel/i);
    act(() => {
      nextFrame(0);
      nextFrame(6000);
    });
    expect(screen.getByText(/you hit the grandma and cat/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByAltText(/^dog$/i);
    expect(screen.queryByRole('link', { name: 'Start assessment' })).toBeNull();
    act(() => {
      nextFrame(0);
      nextFrame(10000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByRole('link', { name: 'Start assessment' });
    const expected = {
      Preservation: 75, Empathy: 82, Ecology: 0, Cooperation: 0, Adaptability: 0,
    };
    const radar = screen.getByRole('img', { name: /Preservation: 75/ });
    for (const [field, score] of Object.entries(expected)) {
      expect(radar).toHaveAccessibleName(new RegExp(`${field}: ${score} out of 100`));
    }
    expect(JSON.parse(window.localStorage.getItem('robot-assessment-scores'))).toEqual(expected);
  } finally {
    requestFrame.mockRestore();
  }
});

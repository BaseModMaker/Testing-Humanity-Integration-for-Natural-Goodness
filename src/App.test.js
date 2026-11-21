import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./UmbrellaDilemma', () => ({ onComplete }) => (
  <button onClick={() => onComplete({ scores: { rainProtection: 25, empathy: 12, ecology: 40 } })}>
    Finish umbrella
  </button>
));

jest.mock('./RobotEmotionGame', () => ({ onComplete }) => (
  <button onClick={() => onComplete({ average: 82 })}>Finish emotions</button>
));

test('runs the games in order and keeps passport data in memory', async () => {
  window.localStorage.clear();
  window.location.hash = '#/assessments';
  let nextFrame;
  const requestFrame = jest.spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });

  try {
    const { unmount } = render(<App />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'Atlas' } });
    const start = screen.getByRole('link', { name: 'Start assessment' });
    fireEvent.click(start);
    fireEvent.click(await screen.findByRole('button', { name: 'Finish umbrella' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish emotions' }));

    await screen.findByAltText(/steering wheel/i);
    act(() => {
      nextFrame(0);
      nextFrame(3999);
    });
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    act(() => nextFrame(4000));
    expect(screen.getByText(/you hit the grandma and cat/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const dog = await screen.findByAltText(/^dog$/i);
    expect(screen.queryByRole('link', { name: 'Start assessment' })).toBeNull();
    const petArea = dog.parentElement.querySelector('.pet-area');
    petArea.setPointerCapture = jest.fn();
    const movePetPointer = (type, clientX, clientY) => {
      fireEvent(petArea, new MouseEvent(type, { bubbles: true, clientX, clientY }));
    };
    movePetPointer('pointerdown', 10, 0);
    movePetPointer('pointermove', 0, 10);
    movePetPointer('pointermove', -10, 0);
    movePetPointer('pointermove', 0, -10);
    movePetPointer('pointermove', 10, 0);
    act(() => {
      nextFrame(0);
      nextFrame(10000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByRole('link', { name: 'Start assessment' });
    expect(screen.getByRole('status')).toHaveTextContent('You did not pass the assessment. Average 33.8/100.');
    const expected = {
      Preservation: 25, Empathy: 94, Ecology: 40, Cooperation: 10, Adaptability: 0,
    };
    const radar = screen.getByRole('img', { name: /Preservation: 25/ });
    for (const [field, score] of Object.entries(expected)) {
      expect(radar).toHaveAccessibleName(new RegExp(`${field}: ${score} out of 100`));
    }
    expect(screen.getByLabelText(/model/i)).toHaveValue('Atlas');
    expect(window.localStorage.getItem('robot-assessment-scores')).toBeNull();
    expect(window.localStorage.getItem('robot-passport')).toBeNull();

    unmount();
    render(<App />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByLabelText(/model/i)).toHaveValue('');
    expect(screen.getByRole('img', { name: /Preservation: not assessed/ })).toBeInTheDocument();
  } finally {
    requestFrame.mockRestore();
  }
});

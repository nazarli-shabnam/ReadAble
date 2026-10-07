import { fireEvent, render, screen } from "@testing-library/react-native";
import { QuestionCard } from "./QuestionCard";

const speech = { source: null, status: "idle", play: jest.fn(), stop: jest.fn() };

test("an answer links back to its sentence in the original text", () => {
  const ask = jest.fn(() => ({
    found: true,
    answer: "The fee is $20.",
    confidence: 90,
    source: { sentenceIndex: 2 },
  }));
  const onShow = jest.fn();
  render(<QuestionCard docId="d1" ask={ask} speech={speech} onShow={onShow} />);

  fireEvent.changeText(screen.getByLabelText("Your question"), "How much is the fee?");
  fireEvent.press(screen.getByText("Ask"));

  // The sentence number is not shown: the reader may display a different version.
  expect(screen.queryByText(/From sentence/)).toBeNull();
  fireEvent.press(screen.getByText("Show in text"));
  expect(onShow).toHaveBeenCalledWith(2);
});

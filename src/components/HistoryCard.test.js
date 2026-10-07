import { fireEvent, render, screen } from "@testing-library/react-native";
import { HistoryCard, orderHistory, searchHistory } from "./HistoryCard";

const rec = (id, rawText, extra = {}) => ({
  id,
  rawText,
  createdAt: "2025-03-01T10:00:00.000Z",
  ...extra,
});
const history = [
  rec("1", "Electricity bill for March."),
  rec("2", "Doctor appointment on Friday."),
  rec("3", "School trip form.", { title: "Kids school" }),
  rec("4", "Rent contract.", { pinned: true }),
  rec("5", "Gym membership terms."),
  rec("6", "Passport renewal steps."),
];

test("pinned texts come first and search matches titles and text", () => {
  expect(orderHistory(history)[0].id).toBe("4");
  expect(searchHistory(history, "kids").map((r) => r.id)).toEqual(["3"]);
  expect(searchHistory(history, "FRIDAY doctor").map((r) => r.id)).toEqual(["2"]);
  expect(searchHistory(history, "  ")).toBe(history);
});

const renderCard = (onUpdateMeta = jest.fn()) => {
  render(
    <HistoryCard
      history={history}
      activeId="1"
      loading={false}
      error={null}
      onOpen={() => {}}
      onDelete={() => {}}
      onUpdateMeta={onUpdateMeta}
      onClearAll={() => {}}
      onRetry={() => {}}
    />
  );
  return onUpdateMeta;
};

test("typing in the search box filters the list, even beyond the collapsed five", () => {
  renderCard();
  fireEvent.changeText(screen.getByLabelText("Search saved texts"), "passport");
  expect(screen.getByText(/Passport renewal steps/)).toBeTruthy();
  expect(screen.queryByText(/Electricity bill/)).toBeNull();

  fireEvent.changeText(screen.getByLabelText("Search saved texts"), "zzz");
  expect(screen.getByText(/No saved text matches/)).toBeTruthy();
});

test("a saved text can be pinned and renamed", () => {
  const onUpdateMeta = renderCard();
  fireEvent.press(screen.getByLabelText("Pin: Electricity bill for March."));
  expect(onUpdateMeta).toHaveBeenCalledWith("1", { pinned: true });

  fireEvent.press(screen.getByLabelText("Rename: Electricity bill for March."));
  fireEvent.changeText(screen.getByLabelText("Name for this text"), "Power bill");
  fireEvent.press(screen.getByText("Save"));
  expect(onUpdateMeta).toHaveBeenCalledWith("1", { title: "Power bill" });
});

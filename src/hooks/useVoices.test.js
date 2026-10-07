import { pickVoices } from "./useVoices";

test("keeps English voices, sorted by name, and drops the rest", () => {
  const voices = [
    { identifier: "b", name: "Zoe", language: "en-US" },
    { identifier: "c", name: "Amelie", language: "fr-FR" },
    { identifier: "a", name: "Alex", language: "en_GB" },
    { identifier: "", name: "Broken", language: "en-US" },
  ];
  expect(pickVoices(voices).map((v) => v.name)).toEqual(["Alex", "Zoe"]);
  expect(pickVoices(null)).toEqual([]);
});

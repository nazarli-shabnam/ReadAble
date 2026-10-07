import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { STORAGE_KEYS } from "../utils/storage";
import { useSettings } from "./useSettings";

beforeEach(() => AsyncStorage.clear());

test("reports loaded only once the saved settings are in", async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ highContrast: true, fontSize: 24 }));
  const { result } = renderHook(() => useSettings());
  expect(result.current[2]).toBe(false);

  await waitFor(() => expect(result.current[2]).toBe(true));
  expect(result.current[0]).toMatchObject({ highContrast: true, fontSize: 24 });
});

test("a change made before loading finishes is merged with the saved settings, not instead of them", async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ highContrast: true }));
  const { result } = renderHook(() => useSettings());
  act(() => result.current[1]({ fontSize: 28 }));

  await waitFor(() => expect(result.current[2]).toBe(true));
  expect(result.current[0]).toMatchObject({ highContrast: true, fontSize: 28 });
  const stored = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS));
  expect(stored).toMatchObject({ highContrast: true, fontSize: 28 });
});

test("later changes update and save as before", async () => {
  const { result } = renderHook(() => useSettings());
  await waitFor(() => expect(result.current[2]).toBe(true));
  act(() => result.current[1]({ ttsRate: 1.4 }));
  expect(result.current[0].ttsRate).toBe(1.4);
  expect(result.current[0].fontSize).toBe(DEFAULT_SETTINGS.fontSize);
});

import { Pressable, StyleSheet, View } from "react-native";
import { SETTING_LIMITS, OVERLAY_COLORS, clampToStep } from "../constants/settings";
import { FONT_FACES, useTheme } from "../theme";
import { Button, Toggle, Txt } from "./ui";

const Stepper = ({ label, value, limits, onChange, format = String }) => {
  const shown = format(value);
  return (
    <View style={styles.stepper}>
      <Txt variant="label" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Button
        label="−"
        accessibilityLabel={`Decrease ${label.toLowerCase()}, now ${shown}`}
        disabled={value <= limits.min}
        onPress={() => onChange(clampToStep(value - limits.step, limits))}
      />
      <Txt
        variant="label"
        style={styles.stepperValue}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${label} ${shown}`}
      >
        {shown}
      </Txt>
      <Button
        label="+"
        accessibilityLabel={`Increase ${label.toLowerCase()}, now ${shown}`}
        disabled={value >= limits.max}
        onPress={() => onChange(clampToStep(value + limits.step, limits))}
      />
    </View>
  );
};

/**
 * Reading preferences shown in the reader's collapsible panel.
 * @param {object} settings - see DEFAULT_SETTINGS
 * @param {(changes: object) => void} onChange
 */
export const ReadingSettings = ({ settings, onChange }) => {
  const t = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: t.field, borderColor: t.border, borderWidth: t.borderWidth }]}>
      <View style={{ gap: 8 }}>
        <Txt variant="label">Reading font</Txt>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Reading font">
          {Object.entries(FONT_FACES).map(([id, face]) => (
            <Button
              key={id}
              label={face.label}
              selected={settings.fontFamily === id}
              onPress={() => onChange({ fontFamily: id })}
            >
              <Txt
                variant="label"
                style={{
                  fontFamily: face.bold,
                  fontWeight: face.bold ? undefined : "700",
                  color: settings.fontFamily === id ? t.onSelected : t.ink,
                }}
              >
                {face.label}
              </Txt>
            </Button>
          ))}
        </View>
      </View>

      <Stepper
        label="Text size"
        value={settings.fontSize}
        limits={SETTING_LIMITS.fontSize}
        onChange={(v) => onChange({ fontSize: v })}
      />
      <Stepper
        label="Line spacing"
        value={settings.lineSpacing}
        limits={SETTING_LIMITS.lineSpacing}
        onChange={(v) => onChange({ lineSpacing: v })}
        format={(v) => `${v.toFixed(1)}×`}
      />
      <Stepper
        label="Letter spacing"
        value={settings.letterSpacing}
        limits={SETTING_LIMITS.letterSpacing}
        onChange={(v) => onChange({ letterSpacing: v })}
        format={(v) => v.toFixed(1)}
      />

      <Toggle
        label="High contrast"
        hint="Black text, bold outlines, bright highlights"
        value={settings.highContrast}
        onValueChange={(v) => onChange({ highContrast: v })}
      />
      <Toggle
        label="Focus mode"
        hint="Show one sentence at a time"
        value={settings.focusMode}
        onValueChange={(v) => onChange({ focusMode: v })}
      />
      {settings.highContrast ? (
        // High contrast always uses a plain background, so tint controls would do nothing.
        <Txt variant="caption" muted>
          Colored background is not used in high contrast. Your choice is kept for when you turn
          high contrast off.
        </Txt>
      ) : (
        <Toggle
          label="Colored background"
          hint="A tint behind the text can make it easier to read"
          value={settings.overlayEnabled}
          onValueChange={(v) => onChange({ overlayEnabled: v })}
        />
      )}
      {settings.overlayEnabled && !settings.highContrast && (
        <View style={{ gap: 10 }}>
          <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Background color">
            {OVERLAY_COLORS.map((c) => {
              const selected = c.value === settings.overlayColor;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => onChange({ overlayColor: c.value })}
                  accessibilityRole="radio"
                  accessibilityLabel={c.label}
                  accessibilityState={{ checked: selected }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: c.value,
                      borderColor: selected ? t.ink : t.border,
                      borderWidth: selected ? 3 : t.borderWidth,
                    },
                  ]}
                />
              );
            })}
          </View>
          <Stepper
            label="Tint strength"
            value={settings.overlayOpacity}
            limits={SETTING_LIMITS.overlayOpacity}
            onChange={(v) => onChange({ overlayOpacity: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { borderRadius: 12, padding: 14, gap: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperValue: { minWidth: 52, textAlign: "center" },
  swatch: { width: 44, height: 44, borderRadius: 22 },
});

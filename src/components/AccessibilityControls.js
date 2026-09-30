import { View, Text, Switch, TouchableOpacity } from "react-native";
import {
  SETTING_LIMITS,
  OVERLAY_COLORS,
  clampToStep,
} from "../constants/settings";

const Stepper = ({ label, value, limits, onChange, formatValue = String }) => (
  <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
    <Text style={{ fontWeight: "600", marginRight: 8 }}>{label}</Text>
    <TouchableOpacity
      onPress={() => onChange(clampToStep(value - limits.step, limits))}
      disabled={value <= limits.min}
      style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#e0e7ff", borderRadius: 8 }}
    >
      <Text>-</Text>
    </TouchableOpacity>
    <Text style={{ minWidth: 48, textAlign: "center", fontSize: 14 }}>
      {formatValue(value)}
    </Text>
    <TouchableOpacity
      onPress={() => onChange(clampToStep(value + limits.step, limits))}
      disabled={value >= limits.max}
      style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#e0e7ff", borderRadius: 8 }}
    >
      <Text>+</Text>
    </TouchableOpacity>
  </View>
);

const fontOptions = [
  { id: "atkinson", label: "Atkinson" },
  { id: "system", label: "System" },
];

/**
 * Reading preferences.
 * @param {object} settings - see DEFAULT_SETTINGS
 * @param {(changes: object) => void} onChange
 */
export const AccessibilityControls = ({ settings, onChange }) => (
  <View style={{ marginVertical: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ fontWeight: "600", marginRight: 8 }}>High contrast</Text>
      <Switch
        value={settings.highContrast}
        onValueChange={(v) => onChange({ highContrast: v })}
      />
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ fontWeight: "600", marginRight: 8 }}>Color overlay</Text>
      <Switch
        value={settings.overlayEnabled}
        onValueChange={(v) => onChange({ overlayEnabled: v })}
      />
    </View>
    {settings.overlayEnabled ? (
      <View style={{ marginBottom: 8, marginTop: 8 }}>
        <Text style={{ fontWeight: "600", marginBottom: 6 }}>Overlay tint</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {OVERLAY_COLORS.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => onChange({ overlayColor: c.value })}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: c.value,
                borderWidth: c.value === settings.overlayColor ? 2 : 1,
                borderColor: c.value === settings.overlayColor ? "#111827" : "#d1d5db",
              }}
            />
          ))}
        </View>
        <Stepper
          label="Overlay"
          value={settings.overlayOpacity}
          limits={SETTING_LIMITS.overlayOpacity}
          onChange={(v) => onChange({ overlayOpacity: v })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      </View>
    ) : null}
    <Stepper
      label="Font"
      value={settings.fontSize}
      limits={SETTING_LIMITS.fontSize}
      onChange={(v) => onChange({ fontSize: v })}
    />
    <Stepper
      label="Line"
      value={settings.lineSpacing}
      limits={SETTING_LIMITS.lineSpacing}
      onChange={(v) => onChange({ lineSpacing: v })}
      formatValue={(v) => `${v.toFixed(1)}×`}
    />
    <Stepper
      label="Spacing"
      value={settings.letterSpacing}
      limits={SETTING_LIMITS.letterSpacing}
      onChange={(v) => onChange({ letterSpacing: v })}
      formatValue={(v) => v.toFixed(1)}
    />
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Font Family</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {fontOptions.map((font) => (
          <TouchableOpacity
            key={font.id}
            onPress={() => onChange({ fontFamily: font.id })}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: settings.fontFamily === font.id ? "#c7d2fe" : "#e5e7eb",
            }}
          >
            <Text style={{ fontWeight: settings.fontFamily === font.id ? "700" : "600" }}>
              {font.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
      <Text style={{ fontWeight: "600", marginRight: 8 }}>Focus mode</Text>
      <Switch
        value={settings.focusMode}
        onValueChange={(v) => onChange({ focusMode: v })}
      />
    </View>
    <Stepper
      label="TTS Speed"
      value={settings.ttsRate}
      limits={SETTING_LIMITS.ttsRate}
      onChange={(v) => onChange({ ttsRate: v })}
      formatValue={(v) => `${v.toFixed(1)}x`}
    />
  </View>
);

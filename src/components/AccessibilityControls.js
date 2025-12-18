import { View, Text, Switch, TouchableOpacity } from "react-native";

const Stepper = ({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10,
  formatValue,
}) => {
  const handleDecrease = () => {
    const newValue = Math.max(min, Math.round((value - step) * 100) / 100);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, Math.round((value + step) * 100) / 100);
    onChange(newValue);
  };

  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}
    >
      <Text style={{ fontWeight: "600", marginRight: 8 }}>{label}</Text>
      <TouchableOpacity
        onPress={handleDecrease}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: "#e0e7ff",
          borderRadius: 8,
          marginRight: 6,
        }}
      >
        <Text>-</Text>
      </TouchableOpacity>
      <Text style={{ minWidth: 48, textAlign: "center", fontSize: 14 }}>
        {displayValue}
      </Text>
      <TouchableOpacity
        onPress={handleIncrease}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: "#e0e7ff",
          borderRadius: 8,
          marginLeft: 6,
        }}
      >
        <Text>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export const AccessibilityControls = ({
  highContrast,
  onToggleContrast,
  fontScale,
  onFontScaleChange,
  lineHeight,
  onLineHeightChange,
  letterSpacing,
  onLetterSpacingChange,
  overlayEnabled,
  onToggleOverlay,
  overlayColor,
  onOverlayColorChange,
  overlayOpacity,
  onOverlayOpacityChange,
  selectedFont,
  onFontChange,
  focusMode,
  onToggleFocusMode,
}) => {
  const overlayOptions = ["#fef3c7", "#e0f2fe", "#f5f3ff", "#ecfeff"];
  const fontOptions = [
    { id: "atkinson", label: "Atkinson" },
    { id: "system", label: "System" },
  ];

  return (
    <View style={{ marginVertical: 12 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text style={{ fontWeight: "600", marginRight: 8 }}>High contrast</Text>
        <Switch value={highContrast} onValueChange={onToggleContrast} />
      </View>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text style={{ fontWeight: "600", marginRight: 8 }}>Color overlay</Text>
        <Switch value={overlayEnabled} onValueChange={onToggleOverlay} />
      </View>
      {overlayEnabled ? (
        <View style={{ marginBottom: 8, marginTop: 8 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>
            Overlay tint
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {overlayOptions.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => onOverlayColorChange(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: c,
                  borderWidth: c === overlayColor ? 2 : 1,
                  borderColor: c === overlayColor ? "#111827" : "#d1d5db",
                }}
              />
            ))}
          </View>
          <Stepper
            label="Overlay"
            value={overlayOpacity}
            onChange={onOverlayOpacityChange}
            step={0.1}
            min={0}
            max={1}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </View>
      ) : null}
      <Stepper
        label="Font"
        value={fontScale}
        onChange={onFontScaleChange}
        step={1}
        min={14}
        max={28}
      />
      <Stepper
        label="Line"
        value={lineHeight}
        onChange={onLineHeightChange}
        step={2}
        min={16}
        max={36}
      />
      <Stepper
        label="Spacing"
        value={letterSpacing}
        onChange={onLetterSpacingChange}
        step={0.2}
        min={0}
        max={2}
      />
      {onFontChange && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>
            Font Family
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {fontOptions.map((font) => (
              <TouchableOpacity
                key={font.id}
                onPress={() => onFontChange(font.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor:
                    selectedFont === font.id ? "#c7d2fe" : "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    fontWeight: selectedFont === font.id ? "700" : "600",
                  }}
                >
                  {font.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {onToggleFocusMode && (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
        >
          <Text style={{ fontWeight: "600", marginRight: 8 }}>Focus mode</Text>
          <Switch value={focusMode} onValueChange={onToggleFocusMode} />
        </View>
      )}
    </View>
  );
};

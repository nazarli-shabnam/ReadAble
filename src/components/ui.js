import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { UI_FONT, useTheme } from "../theme";

// Shared building blocks. Every control is at least 44pt tall (Apple/WCAG
// target size), exposes its role and state to screen readers, and takes its
// colors from the current theme.

const TEXT_VARIANTS = {
  title: { fontSize: 30, lineHeight: 36, bold: true },
  heading: { fontSize: 20, lineHeight: 26, bold: true },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 16, lineHeight: 22, bold: true },
  caption: { fontSize: 14, lineHeight: 20 },
};

export const Txt = ({ variant = "body", muted, style, ...rest }) => {
  const t = useTheme();
  const v = TEXT_VARIANTS[variant];
  return (
    <Text
      style={[
        {
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          fontFamily: v.bold ? UI_FONT.bold : UI_FONT.regular,
          color: muted ? t.inkMuted : t.ink,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const buttonColors = (t, variant, disabled) => {
  // Disabled keeps the button's shape but drops its fill, so it reads as "not now".
  if (disabled) return { bg: "transparent", fg: t.onDisabled, border: t.disabled };
  switch (variant) {
    case "primary":
      return { bg: t.accent, fg: t.onAccent, border: t.accent };
    case "danger":
      return { bg: t.surface, fg: t.danger, border: t.danger };
    case "quiet":
      return { bg: "transparent", fg: t.ink, border: "transparent" };
    default:
      return { bg: t.surface, fg: t.ink, border: t.border };
  }
};

export const Button = ({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
  selected,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
}) => {
  const t = useTheme();
  const c = selected
    ? { bg: t.selected, fg: t.onSelected, border: t.name === "highContrast" ? t.ink : t.selected }
    : buttonColors(t, variant, disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      hitSlop={4}
      style={({ pressed, focused }) => [
        styles.button,
        // Clear keyboard focus ring (web; `focused` is always false on native).
        focused && { outlineStyle: "solid", outlineWidth: 3, outlineColor: t.focus, outlineOffset: 2 },
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: variant === "quiet" && !selected ? 0 : t.borderWidth,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {children || <Txt variant="label" style={{ color: c.fg }}>{label}</Txt>}
    </Pressable>
  );
};

export const Card = ({ title, action, children, style, onLayout, emphasis }) => {
  const t = useTheme();
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.card,
        {
          backgroundColor: t.surface,
          borderColor: emphasis && t.name !== "highContrast" ? t.accent : t.border,
          borderWidth: t.borderWidth,
        },
        style,
      ]}
    >
      {(title || action) && (
        <View style={styles.cardHeader}>
          {title ? (
            <Txt variant="heading" accessibilityRole="header" style={{ flexShrink: 1 }}>
              {title}
            </Txt>
          ) : null}
          {action}
        </View>
      )}
      {children}
    </View>
  );
};

/** A row of mutually exclusive options. */
export const Segmented = ({ options, value, onChange, accessibilityLabel }) => (
  <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
    {options.map((o) => (
      <Button
        key={o.value}
        label={o.label}
        selected={o.value === value}
        onPress={() => onChange(o.value)}
      />
    ))}
  </View>
);

export const Toggle = ({ label, value, onValueChange, hint }) => {
  const t = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{label}</Txt>
        {hint ? <Txt variant="caption" muted>{hint}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityHint={hint}
        trackColor={{ false: t.switchTrack, true: t.accent }}
        thumbColor="#FFFFFF"
        activeThumbColor="#FFFFFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
});

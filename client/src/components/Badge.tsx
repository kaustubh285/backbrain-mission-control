interface BadgeProps {
  label: string;
  color: string;
}

export function Badge({ label, color }: BadgeProps) {
  return (
    <span style={{
      fontSize: "9px",
      fontWeight: 600,
      letterSpacing: "0.07em",
      padding: "1px 6px",
      borderRadius: "3px",
      border: `1px solid ${color}`,
      color,
      textTransform: "uppercase" as const,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

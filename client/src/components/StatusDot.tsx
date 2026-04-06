type DotStatus = "active" | "cooling" | "idle" | "thinking" | "running-tool" | "waiting-permission";

const DOT_COLOR: Record<DotStatus, string> = {
  active:              "var(--green)",
  thinking:            "var(--cyan2)",
  "running-tool":      "var(--amber)",
  "waiting-permission":"var(--orange)",
  cooling:             "var(--amber)",
  idle:                "var(--text-dim)",
};

const ANIMATED: DotStatus[] = ["active", "thinking", "running-tool", "waiting-permission"];

interface Props {
  status: DotStatus;
  size?: number;
}

export function StatusDot({ status, size = 7 }: Props) {
  const color = DOT_COLOR[status];
  const animated = ANIMATED.includes(status);
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color,
        flexShrink: 0,
        animation: animated ? "pulse-dot 1.4s ease-in-out infinite" : "none",
      }}
    />
  );
}

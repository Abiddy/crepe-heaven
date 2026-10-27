type WavyEdgeProps = {
  color: string;
  position?: "top" | "bottom";
  flip?: boolean;
  className?: string;
};

/** Irregular scalloped edge used between Crepe Heaven sections. */
export function WavyEdge({
  color,
  position = "top",
  flip = false,
  className = "",
}: WavyEdgeProps) {
  const path = flip
    ? "M0,42 C90,78 150,12 270,48 C390,82 450,14 570,46 C690,80 750,18 870,50 C990,84 1050,10 1170,44 C1290,76 1350,20 1440,52 L1440,0 L0,0 Z"
    : "M0,48 C120,18 180,78 300,42 C420,8 480,72 600,38 C720,6 780,70 900,44 C1020,16 1080,68 1200,40 C1320,14 1380,62 1440,34 L1440,90 L0,90 Z";

  return (
    <div
      className={`uma-wave uma-wave--${position} ${className}`.trim()}
      style={{ color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path d={path} fill="currentColor" />
      </svg>
    </div>
  );
}

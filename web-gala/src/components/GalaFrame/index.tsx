/**
 * GalaFrame — wraps children in the signature PCB-corner gold border frame
 * from the official Jantar de Gala visual identity.
 *
 * Usage:
 *   <GalaFrame>...</GalaFrame>
 *   <GalaFrame size={28} color="#c9a843">...</GalaFrame>
 */
type GalaFrameProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
  border?: boolean;
}>;

export default function GalaFrame({
  children,
  className = "",
  size = 22,
  color = "#c9a843",
  border = true,
}: GalaFrameProps) {
  return (
    <div
      className={`relative ${className}`}
      style={
        border
          ? { border: `1px solid ${color}22`, boxSizing: "border-box" }
          : undefined
      }
    >
      {/* TL */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -1,
          left: -1,
          width: size,
          height: size,
          borderTop: `1px solid ${color}`,
          borderLeft: `1px solid ${color}`,
        }}
      />
      {/* TR */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -1,
          right: -1,
          width: size,
          height: size,
          borderTop: `1px solid ${color}`,
          borderRight: `1px solid ${color}`,
        }}
      />
      {/* BL */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: -1,
          left: -1,
          width: size,
          height: size,
          borderBottom: `1px solid ${color}`,
          borderLeft: `1px solid ${color}`,
        }}
      />
      {/* BR */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: -1,
          right: -1,
          width: size,
          height: size,
          borderBottom: `1px solid ${color}`,
          borderRight: `1px solid ${color}`,
        }}
      />
      {children}
    </div>
  );
}

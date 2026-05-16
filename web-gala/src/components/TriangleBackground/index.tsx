import { useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import sparkle1 from "@/assets/sparkle-1.png";
import sparkle2 from "@/assets/sparkle-2.png";
import sparkle3 from "@/assets/sparkle-3.png";

// ─── Sparkles ────────────────────────────────────────────────────────────────

const SPARKLE_IMGS = [sparkle1, sparkle2, sparkle3];

const SPARKLES = [
  { top: "7%",  left: "5%",  size: 56, delay: 0,   duration: 4.0, img: 0 },
  { top: "14%", left: "89%", size: 40, delay: 1.4, duration: 5.0, img: 1 },
  { top: "50%", left: "93%", size: 48, delay: 0.7, duration: 4.5, img: 2 },
  { top: "74%", left: "4%",  size: 36, delay: 2.2, duration: 5.2, img: 1 },
  { top: "86%", left: "80%", size: 44, delay: 1.0, duration: 3.8, img: 0 },
];

function Sparkle({ top, left, size, delay, duration, img }: (typeof SPARKLES)[0]) {
  return (
    <img
      aria-hidden
      src={SPARKLE_IMGS[img]}
      alt=""
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        animation: `sparkle-appear ${duration}s ${delay}s ease-in-out infinite`,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}

// ─── Matrix rain ─────────────────────────────────────────────────────────────

const CHARS = "01";
const COL_W = 36;        // column width in px
const CHAR_H = 18;       // row height in px
const FPS = 7;           // frames per second — slow classic feel
const TRAIL = 10;        // number of characters in each drop trail
const DROP_OPACITY = 0.08; // max opacity of head character

const MatrixCanvas = memo(function MatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const cols = Math.floor(W / COL_W);
    const rows = Math.ceil(H / CHAR_H) + TRAIL + 2;

    // Each column: current head row (can be negative = off-screen above)
    const heads = Array.from({ length: cols }, () =>
      -Math.floor(Math.random() * rows),
    );
    // Characters stored per cell so they don't flicker each frame
    const grid: string[][] = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)],
      ),
    );

    ctx.font = `${CHAR_H - 3}px "Courier New", monospace`;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      for (let c = 0; c < cols; c++) {
        const head = heads[c];
        const x = c * COL_W + 3;

        for (let t = 0; t < TRAIL; t++) {
          const row = head - t;
          if (row < 0 || row >= rows) continue;

          // Fade from head (full) to tail (transparent)
          const frac = 1 - t / TRAIL;
          ctx.globalAlpha = DROP_OPACITY * frac * frac;
          ctx.fillStyle = "#00ff41";
          ctx.fillText(grid[c][row], x, row * CHAR_H);
        }

        heads[c]++;
        // Reset when the entire trail has scrolled off screen
        if ((heads[c] - TRAIL) * CHAR_H > H) {
          heads[c] = -Math.floor(Math.random() * 8);
          // Randomise characters in this column for variety
          for (let r = 0; r < rows; r++) {
            grid[c][r] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
      }

      ctx.globalAlpha = 1;
    }

    timerRef.current = setInterval(draw, 1000 / FPS);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      ctx.font = `${CHAR_H - 3}px "Courier New", monospace`;
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
});

// ─── Glow orbs ───────────────────────────────────────────────────────────────

const GlowOrbs = memo(function GlowOrbs() {
  return (
    <>
      <div
        className="gala-blur absolute"
        style={{
          left: "8%",
          top: "-15%",
          background: "linear-gradient(135deg, rgba(201,168,67,0.10), rgba(138,106,32,0.06))",
        }}
      />
      <div
        className="gala-blur absolute"
        style={{
          right: "-8%",
          top: "45%",
          background: "linear-gradient(135deg, rgba(138,106,32,0.08), rgba(201,168,67,0.04))",
        }}
      />
      <div
        className="gala-blur absolute"
        style={{
          left: "35%",
          bottom: "-10%",
          background: "linear-gradient(135deg, rgba(201,168,67,0.06), rgba(138,106,32,0.03))",
        }}
      />
    </>
  );
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TriangleBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <GlowOrbs />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3 }}
      >
        <MatrixCanvas />
      </motion.div>
      <div className="absolute inset-0">
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} />
        ))}
      </div>
    </div>
  );
}

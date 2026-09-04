// Exact radial-glow values extracted from the AccessAI2 prototype (via devtools
// inspection of its computed styles) — not approximated.

export function GlowSidebar() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -90,
        right: -70,
        width: 240,
        height: 240,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,176,155,0.28) 0%, rgba(0,176,155,0) 70%)",
        pointerEvents: "none",
      }}
    />
  );
}

export function GlowHero() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -140,
          left: "12%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,176,155,0.28) 0%, rgba(0,176,155,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -180,
          right: "8%",
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,51,141,0.5) 0%, rgba(0,51,141,0) 70%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

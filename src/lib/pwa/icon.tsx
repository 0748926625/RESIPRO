import { ImageResponse } from "next/og";

// One shared shape for every generated app icon (favicon, apple-touch-icon, and the two
// manifest sizes) so the brand mark can't drift between them. Solid background + "RP"
// centered — content stays within the safe zone for maskable icons.
export function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#c2603a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.5),
          fontWeight: 700,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        RP
      </div>
    ),
    { width: size, height: size },
  );
}

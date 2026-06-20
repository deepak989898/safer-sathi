import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 36,
          padding: 16,
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "#1e3a5f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              color: "#f97316",
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            SS
          </div>
        </div>
        <div
          style={{
            color: "#1e3a5f",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Safar Sathi
        </div>
      </div>
    ),
    { ...size }
  );
}

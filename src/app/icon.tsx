import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#1e3a5f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f97316",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          SS
        </div>
      </div>
    ),
    { ...size }
  );
}

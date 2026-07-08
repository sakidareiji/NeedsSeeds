import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Needs Seeds — 困りごとが解決に向かう場所";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "困りごとが解決に向かう場所";

/** 日本語表示用にサブセット化したフォントを実行時に取得(失敗時は英字のみで描画)。 */
async function loadJpFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const font = await loadJpFont(TAGLINE);

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
          background: "linear-gradient(135deg, #fdf6ef 0%, #fae8d6 100%)",
          fontFamily: font ? "NotoSansJP" : undefined,
        }}
      >
        {/* 芽のマーク */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "#dd7524",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 72,
            }}
          >
            🌱
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 88,
            fontWeight: 700,
            color: "#6c3218",
          }}
        >
          Needs Seeds
        </div>
        {font && (
          <div style={{ marginTop: 16, fontSize: 40, color: "#a64818" }}>
            {TAGLINE}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "NotoSansJP", data: font, weight: 700 as const }]
        : undefined,
    }
  );
}

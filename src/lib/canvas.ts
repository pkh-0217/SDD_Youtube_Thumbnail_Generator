// 썸네일 합성(클라 canvas 전용). 배치 계산은 순수 함수 computeTitleLayout로 분리해
// canvas 없이 단위 테스트할 수 있게 한다(ADR-004: 위치/색 커스터마이즈 없음, 고정 스타일).

export const THUMB_W = 1280;
export const THUMB_H = 720;

const FONT_FAMILY =
  '-apple-system, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif';

// 배치 튜닝 상수 (canvas 높이/너비 비율 기준).
const SIDE_MARGIN = 0.05; // 좌우 여백(각) → 사용 가능 폭 90%
const BOTTOM_MARGIN = 0.07; // 하단 여백
const BASE_FONT_RATIO = 0.12; // 기본 폰트 크기(= H * 0.12)
const MIN_FONT_RATIO = 0.06; // 최소 폰트 크기
const SHRINK_TARGET_LINES = 2; // 이 줄 수 이하가 되도록 폰트를 줄인다
const CHAR_W_RATIO = 0.58; // 굵은 sans 기준 문자폭 ≈ fontSize * 0.58 (측정 없이 근사)
const LINE_HEIGHT_RATIO = 1.18;

export interface TitleLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** 첫 줄 베이스라인 y좌표. 이후 줄은 +lineHeight. */
  startY: number;
  scrimTop: number;
  scrimHeight: number;
  maxWidth: number;
}

function estimateWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_W_RATIO;
}

/** 폭에 맞춰 줄바꿈한다. 띄어쓰기가 있으면 단어 경계를, 없으면(한글 등) 문자 단위로 끊는다. */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  const fits = (s: string) => estimateWidth(s, fontSize) <= maxWidth;
  const lines: string[] = [];
  let line = "";

  for (const ch of normalized) {
    if (line === "" || fits(line + ch)) {
      line += ch;
      continue;
    }
    const lastSpace = line.lastIndexOf(" ");
    if (lastSpace > 0) {
      lines.push(line.slice(0, lastSpace));
      line = line.slice(lastSpace + 1) + ch;
    } else {
      lines.push(line);
      line = ch;
    }
  }
  if (line.trim()) lines.push(line);
  return lines.map((l) => l.trim()).filter(Boolean);
}

/**
 * 제목 텍스트의 배치(폰트 크기/줄바꿈/y좌표/스크림)를 계산하는 순수 함수.
 * 빈 문자열이면 lines가 비어 있다(오버레이 없음).
 */
export function computeTitleLayout(
  text: string,
  canvasW: number = THUMB_W,
  canvasH: number = THUMB_H,
): TitleLayout {
  const maxWidth = canvasW * (1 - SIDE_MARGIN * 2);
  const baseFont = Math.round(canvasH * BASE_FONT_RATIO);
  const minFont = Math.round(canvasH * MIN_FONT_RATIO);

  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return { lines: [], fontSize: 0, lineHeight: 0, startY: 0, scrimTop: canvasH, scrimHeight: 0, maxWidth };
  }

  let fontSize = baseFont;
  let lines = wrapText(trimmed, fontSize, maxWidth);
  while (lines.length > SHRINK_TARGET_LINES && fontSize > minFont) {
    fontSize -= 2;
    lines = wrapText(trimmed, fontSize, maxWidth);
  }

  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);
  const blockHeight = lines.length * lineHeight;
  const bottomMargin = Math.round(canvasH * BOTTOM_MARGIN);
  const startY = canvasH - bottomMargin - blockHeight + Math.round(fontSize);
  const scrimHeight = Math.round(blockHeight + bottomMargin * 1.6);
  const scrimTop = canvasH - scrimHeight;

  return { lines, fontSize, lineHeight, startY, scrimTop, scrimHeight, maxWidth };
}

/** 이미지를 캔버스 전체에 cover-fit(잘림 허용)으로 그린다. */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, w: number, h: number) {
  const iw = (img as { width?: number }).width ?? w;
  const ih = (img as { height?: number }).height ?? h;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** 선택한 이미지 + 제목 오버레이를 1280×720 캔버스에 합성한다. */
export function drawThumbnail(
  ctx: CanvasRenderingContext2D,
  { imageBitmap, titleText }: { imageBitmap: CanvasImageSource; titleText: string },
) {
  const w = THUMB_W;
  const h = THUMB_H;
  ctx.clearRect(0, 0, w, h);
  drawCover(ctx, imageBitmap, w, h);

  const layout = computeTitleLayout(titleText, w, h);
  if (layout.lines.length === 0) return;

  // 하단 스크림(반투명 검정 그라데이션 띠).
  const grad = ctx.createLinearGradient(0, layout.scrimTop, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, layout.scrimTop, w, layout.scrimHeight);

  // 굵은 텍스트 + 외곽선.
  ctx.font = `700 ${layout.fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, Math.round(layout.fontSize * 0.12));
  ctx.strokeStyle = "rgba(0,0,0,0.92)";
  ctx.fillStyle = "#ffffff";

  layout.lines.forEach((line, i) => {
    const y = layout.startY + i * layout.lineHeight;
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
  });
}

/** 캔버스를 PNG Blob으로 내보낸다. */
export function exportPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 인코딩에 실패했어요."));
    }, "image/png");
  });
}

/** Blob을 파일로 다운로드시킨다. */
export function triggerDownload(blob: Blob, filename = "thumbnail.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

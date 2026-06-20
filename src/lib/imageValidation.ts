// 클라이언트 업로드 검증. route(신뢰 경계)와 동일 규칙을 제출 전 인라인으로 거부한다.
// (route의 검증과 의도적으로 중복 — CLAUDE.md: 클라/route 양쪽 검증)

export const MAX_IMAGES = 4;
export const MAX_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

interface FileLike {
  type: string;
  size: number;
}

/** 업로드 목록을 검증한다. 위반 시 한국어 사유, 통과 시 null. */
export function validateImages(files: FileLike[]): string | null {
  if (files.length > MAX_IMAGES) {
    return "이미지는 최대 4장까지 업로드할 수 있어요.";
  }
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) {
      return "PNG·JPEG·WEBP 이미지만 업로드할 수 있어요.";
    }
    if (f.size > MAX_BYTES) {
      return "이미지는 각 8MB 이하만 업로드할 수 있어요.";
    }
  }
  return null;
}

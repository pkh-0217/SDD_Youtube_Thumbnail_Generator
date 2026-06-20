import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import type { Candidate, GenerateResult } from "@/types";
import { mapError, STATUS, validate } from "./lib";

// Next.js: 생성 지연(15~40초)을 대비해 기본보다 길게 둔다.
export const maxDuration = 60;

// --- gpt-image-2 호출 파라미터 (한 곳에서 상수 관리) ---
const MODEL = "gpt-image-2";
const SIZE = "1280x720";
const QUALITY = "medium";
const N = 3;
// gpt-image-2의 images.generate는 output_format:"webp"를 무시하고 PNG를 반환하는 알려진 이슈가 있어
// 실제로 반영되는 jpeg를 쓴다(페이로드 절감, ADR-008). 최종 다운로드 PNG는 클라 canvas가 만든다.
const OUTPUT_FORMAT = "jpeg";

// 서버 타임아웃: maxDuration 안에서 업스트림 호출을 중단할 여유를 둔다.
const TIMEOUT_MS = 55_000;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") ?? "");
    const images = form.getAll("images").filter((v): v is File => v instanceof File);

    const invalid = validate(prompt, images);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: STATUS[invalid.code] });
    }

    // 키 누락을 명확히 처리한다(빈 키면 SDK가 모호한 예외를 던져 원인이 가려진다).
    if (!process.env.OPENAI_API_KEY?.trim()) {
      console.error("[/api/generate] OPENAI_API_KEY가 비어 있습니다. .env.local 설정 후 dev 서버를 재시작하세요.");
      return NextResponse.json({ error: mapError({ status: 401, message: "missing api key" }) }, { status: 502 });
    }

    // 클라이언트는 핸들러 내부에서 지연 생성(import만으로 env 의존이 생기지 않도록).
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // gpt-image-2는 SDK 타입 유니온에 없으므로 호출 파라미터를 캐스팅한다.
    const params = {
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      n: N,
      output_format: OUTPUT_FORMAT,
    };

    let result;
    try {
      if (images.length > 0) {
        const files = await Promise.all(
          images.map((f, i) => toFile(f, f.name || `image-${i}.png`, { type: f.type })),
        );
        result = await openai.images.edit(
          { ...params, image: files } as unknown as OpenAI.Images.ImageEditParams,
          { signal: controller.signal },
        );
      } else {
        result = await openai.images.generate(
          params as unknown as OpenAI.Images.ImageGenerateParams,
          { signal: controller.signal },
        );
      }
    } finally {
      clearTimeout(timer);
    }

    const data = (result as OpenAI.Images.ImagesResponse).data ?? [];
    const candidates: Candidate[] = data.map((d, i) => ({
      id: `cand-${i}`,
      b64: d.b64_json ?? "",
      mime: "image/jpeg",
    }));

    return NextResponse.json({ candidates } satisfies GenerateResult);
  } catch (e) {
    // 실제 업스트림 원인을 서버 로그에 남긴다(401/403/타임아웃 등은 UI에선 UPSTREAM_ERROR로 합쳐진다).
    console.error("[/api/generate]", e);
    const error = mapError(e);
    return NextResponse.json({ error }, { status: STATUS[error.code] });
  }
}

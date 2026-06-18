import { NextResponse } from "next/server";

// Server-side Replicate proxy for the 리얼콜 path.
// image-to-video, 9 variations in parallel. Because video gen routinely takes
// >60s, we DON'T block: POST creates 9 predictions and returns their ids;
// the client polls GET ?ids=... until all 9 succeed. Token stays server-side.
//
// Env (app/.env.local locally, Vercel project env in prod):
//   REPLICATE_API_TOKEN   r8_...
//   REPLICATE_MODEL       owner/model  (default wan-video/wan-2.2-i2v-fast)

export const runtime = "nodejs";

const TOKEN = process.env.REPLICATE_API_TOKEN;
const MODEL = process.env.REPLICATE_MODEL ?? "wan-video/wan-2.2-i2v-fast";

// The 9 image-to-video prompts, used verbatim (one per parallel prediction).
const PROMPTS: string[] = [
  "Create a short 4-second animation of this album package slowly rotating from left angle to front view, like a premium collector’s edition product showcase. Keep the original cover artwork and colors unchanged. Clean studio lighting, soft shadow, no text added.",
  "Create a seamless 4-second looping animation of this album package with a gentle push-in and pull-out zoom effect. The product stays centered while the camera moves closer and farther in a smooth breathing motion. Keep the album cover design exactly the same. Premium lighting, soft shadow, no people, no extra objects.",
  "Create a seamless 4-second looping animated sticker-style video using the uploaded album package image as the main subject. Keep the album cover artwork, typography, colors, shape, and overall design exactly the same. Do not redesign the product. Do not change the text on the album. Animation direction: The album pops into the center with a soft elastic bounce, like a premium animated sticker. After the bounce, it gently wiggles left and right with a cute collectible feel. Add subtle sparkle particles around the album and a soft glossy shine sweeping across the cover. The movement should feel playful, smooth, clean, and polished, similar to animated stickers used in KakaoTalk or Instagram Stories. Loop requirement: The video must be exactly 4 seconds and loop perfectly. The final frame should smoothly return to the first frame with no visible jump. Visual style: Premium ecommerce product animation, cute animated sticker style, clean studio lighting, soft shadow, high-quality product presentation. Restrictions: No people. No hands. No extra text. No logos added. No new objects except subtle sparkles and light effects. Do not distort the album. Do not change the album artwork. Keep the product centered and fully visible.",
  "Create a 4-second seamless looping image-to-video animation using the uploaded album package as the main subject. Keep the album artwork, typography, colors, and shape exactly unchanged. The product should look like the same real album package, not a redesigned version. Animation concept: Make the album feel like a premium animated collectible sticker. The album quickly slides in from the bottom with a smooth elastic bounce, slightly overshoots, then settles in the center. After settling, it does a gentle playful tilt left and right. Add a soft glow pulse behind the album and small sparkle effects around the edges. A subtle light reflection moves across the album cover to make it feel glossy and premium. Motion timing: 0.0s - 0.7s: album slides up into frame with elastic bounce 0.7s - 2.2s: gentle left-right tilt and small floating motion 2.2s - 3.3s: glossy shine sweep across the cover with small sparkles 3.3s - 4.0s: smoothly return to the first frame for a perfect loop Style: Cute premium animated sticker style, KakaoTalk / Instagram story sticker vibe, smooth motion, clean studio lighting, soft shadow, high-quality ecommerce asset. Restrictions: No people, no hands, no added text, no new logos, no extra objects except subtle sparkles and glow. Do not distort or warp the album. Keep the album centered and fully visible.",
  "4-second seamless looping image-to-video animation. Use the uploaded album package as the main subject. Keep the product artwork, typography, colors, and shape unchanged. Animated sticker style: the album pops into the center with a soft elastic bounce, gently wiggles left and right, with subtle sparkle particles and a glossy shine sweep across the cover. Premium cute ecommerce sticker motion, smooth and polished. No people, no hands, no added text, no extra objects except subtle sparkles and light effects. Keep the album centered, sharp, realistic, and fully visible. Final frame must match the first frame for a perfect loop.",
  "Create a 4-second seamless looping animated sticker video using the uploaded album package as the main subject. Keep the original album cover, typography, colors, and product shape exactly the same. Animation concept: Make the album look like a premium collectible card sticker. Add a stylish rectangular frame around the album, like a music collectible card. The album gently floats inside the frame, tilts slightly left and right, and returns to the start position. Add a soft holographic shine passing across the frame and cover. Frame style: The frame should be elegant and minimal, with rounded corners, subtle glow, and a premium K-pop album collectible feeling. Do not add any readable text. Motion timing: 0-1s: album and frame pop in with a soft bounce 1-2.5s: gentle floating and tiny tilt 2.5-3.5s: holographic shine sweep 3.5-4s: smoothly return to first frame Restrictions: No people, no hands, no added text, no extra objects except frame, glow, sparkles, and shine. Do not distort the album.",
  "Create a 4-second seamless looping image-to-video animation using the uploaded album package as the main subject. Keep the album artwork, typography, colors, and shape unchanged. Do not redesign the product. Animation concept: Turn the album into a premium animated sticker. The album pops into the center with a soft elastic bounce. Add a thin glowing neon outline around the album, like a sticker border. The outline gently pulses 2 times during the loop. Add small sparkle particles around the border and a soft glossy shine sweeping across the album cover. Frame and highlight: Add a clean rounded sticker-style frame behind the album, slightly larger than the product, with a soft glow and subtle shadow. The frame should make the album stand out but not cover the artwork. Loop: Exactly 4 seconds. Final frame must smoothly match the first frame for a perfect loop. Restrictions: No people, no hands, no added text, no new logos. Only add the glowing outline, sticker frame, sparkles, and light effects. Keep the album centered and fully visible.",
  "Create a 4-second seamless looping image-to-video animation using the uploaded album package as the main subject. Keep the album artwork, typography, colors, and shape unchanged. Animation concept: Create a cute premium sticker animation. The album appears in the center with a bouncy pop. Add a soft white sticker border around the album and a glowing spotlight ring behind it. The spotlight ring slowly expands and fades, then resets perfectly for the loop. Add small star sparkles near the corners of the album. Highlight elements: Add a clean sticker border, soft glowing ring, subtle shadow, and premium light reflection on the cover. The album should look like a highlighted product sticker for an ecommerce detail page. Loop: Exactly 4 seconds, seamless loop. End frame should transition naturally back to the first frame. Restrictions: No people, no hands, no added text, no new logos, no extra props. Keep the album centered, sharp, and fully visible.",
  "Create a 4-second seamless looping animated sticker-style video using the uploaded album package as the main subject. Keep the original album design, text, colors, and product shape unchanged. Animation concept: The album slides slightly forward with a soft bounce, then gently wiggles like an animated sticker. Add four small animated corner brackets around the album, like a product highlight frame. The corner brackets softly move inward and outward to focus attention on the album. Add a glossy light sweep across the cover and a few subtle sparkles. Frame style: Use minimal clean corner-frame graphics, not a full box. The brackets should highlight the album without covering it. Premium ecommerce / KakaoTalk sticker vibe. Motion: 0-0.8s: album pops forward with elastic bounce 0.8-2.2s: gentle wiggle and floating motion 2.2-3.2s: corner brackets pulse inward and outward 3.2-4s: glossy shine sweep and return to the first frame Restrictions: No people, no hands, no added text, no extra logos. Only use corner brackets, sparkles, glow, and shine effects. Do not warp or change the album.",
];

async function rfetch(path: string, init?: RequestInit) {
  return fetch(`https://api.replicate.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// POST: create one prediction per prompt (9), return their ids.
export async function POST(req: Request) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN not set — use the 프리메이드 toggle or set the env var." },
      { status: 500 },
    );
  }
  const { thumbnailUrl } = await req.json().catch(() => ({}));
  if (!thumbnailUrl) {
    return NextResponse.json({ error: "thumbnailUrl required" }, { status: 400 });
  }

  try {
    const created = await Promise.all(
      PROMPTS.map((prompt, i) =>
        rfetch(`/models/${MODEL}/predictions`, {
          method: "POST",
          body: JSON.stringify({
            input: {
              image: thumbnailUrl,
              last_image: thumbnailUrl, // start == end -> seamless loop
              prompt,
              seed: i,
            },
          }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`create ${r.status}: ${await r.text()}`);
          return (await r.json()).id as string;
        }),
      ),
    );
    return NextResponse.json({ ids: created });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

// GET ?ids=a,b,c : poll each prediction, return status + output url.
export async function GET(req: Request) {
  if (!TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not set" }, { status: 500 });
  }
  const ids = new URL(req.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const results = await Promise.all(
    ids.map(async (id) => {
      const r = await rfetch(`/predictions/${id}`);
      if (!r.ok) return { id, status: "failed", output: null, error: `poll ${r.status}` };
      const d = (await r.json()) as { status: string; output?: unknown; error?: string };
      const out = Array.isArray(d.output) ? d.output[d.output.length - 1] : d.output;
      return { id, status: d.status, output: out ? String(out) : null, error: d.error ?? null };
    }),
  );
  return NextResponse.json({ results });
}

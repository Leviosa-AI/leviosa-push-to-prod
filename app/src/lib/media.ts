// Shared media-type detection for generated assets.
// Premade candidates are images (picsum); the 리얼콜 (Replicate) path returns
// mp4 video. Replicate's delivery URLs often have NO file extension
// (e.g. https://replicate.delivery/.../tmpXXXX), so extension-matching alone
// misses them — treat any replicate.delivery URL as video too.
//
// Keep this single source of truth so the grid and the editor never disagree
// about whether to render <video> or <img>.
export function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("replicate.delivery");
}

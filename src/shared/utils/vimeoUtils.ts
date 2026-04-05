export function toVimeoEmbedUrl(url: string): string | null {
  const manageMatch = url.match(/vimeo\.com\/manage\/videos\/(\d+)\/([a-zA-Z0-9]+)/);
  if (manageMatch) {
    return `https://player.vimeo.com/video/${manageMatch[1]}?h=${manageMatch[2]}&badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  const directMatch = url.match(/vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/);
  if (directMatch) {
    return `https://player.vimeo.com/video/${directMatch[1]}?h=${directMatch[2]}&badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  const simpleMatch = url.match(/vimeo\.com\/(\d+)$/);
  if (simpleMatch) {
    return `https://player.vimeo.com/video/${simpleMatch[1]}?badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  if (url.includes('player.vimeo.com')) {
    return url;
  }
  return null;
}

/**
 * Where to send people after their VCF download finishes.
 * Paste the full URL (including https://). Leave empty to disable the redirect.
 */
export const POST_DOWNLOAD_REDIRECT_URL = "";

/** Waits briefly so the browser can start saving the file, then redirects. */
export function redirectAfterDownload(delayMs = 2500) {
  if (!POST_DOWNLOAD_REDIRECT_URL || typeof window === "undefined") return;
  window.setTimeout(() => {
    window.location.assign(POST_DOWNLOAD_REDIRECT_URL);
  }, delayMs);
}

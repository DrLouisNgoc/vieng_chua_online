// The bell toll: a hidden YouTube embed of a temple-bell recording the
// owner picked (2026-11-11: "tự động phát tiếng chuông chùa này cho tôi"),
// since no local bell-gong.mp3 was ever added (ambience.ts's own bell sound
// stayed silent for lack of the file). Embedding, not downloading, keeps
// playback on YouTube's own servers under their embed terms — same
// reasoning as background-music.ts (decision 0011).
//
// Unlike the looping background music, each toll is one playthrough: ring()
// reassigns the iframe's src with a changing nonce so the browser always
// treats it as a fresh load and restarts from the top, even when the exact
// same bell tolls twice in a row.
const EMBED_ROOT = "https://www.youtube-nocookie.com/embed";

// The owner's link: https://www.youtube.com/watch?v=ZkhnRm4xxbw
export const BELL_VIDEO_ID = "ZkhnRm4xxbw";

export function bellVideoEmbedUrl(videoId: string, nonce: number): string {
  const params = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    modestbranding: "1",
    mute: "0",
    bell: String(nonce),
  });
  return `${EMBED_ROOT}/${videoId}?${params.toString()}`;
}

export interface BellVideo {
  ring: () => void;
}

export function createBellVideo(root: HTMLElement, videoId: string): BellVideo {
  const iframe = document.createElement("iframe");
  iframe.className = "bell-video__frame";
  iframe.allow = "autoplay";
  iframe.title = "Tiếng chuông chùa";
  root.append(iframe);
  let nonce = 0;

  return {
    ring() {
      nonce += 1;
      iframe.src = bellVideoEmbedUrl(videoId, nonce);
    },
  };
}

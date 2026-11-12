// Background music: a hidden YouTube embed of a song the owner picked
// (2026-11-10: "để bài này làm nhạc tự động phát cho tôi"). Embedding (not
// downloading the audio) keeps playback on YouTube's own servers, under
// their embed terms — no local audio file, no copyright exposure like the
// sansatemple.com 3D assets (decision 0011).
//
// Browsers only allow truly automatic audio when it starts muted; a real
// click is needed to unmute. setMuted(false) reloads the iframe's src as
// a direct result of that click, which is enough for most browsers to let
// the sound through.
const EMBED_ROOT = "https://www.youtube-nocookie.com/embed";

// The owner's link: https://www.youtube.com/watch?v=uZatAYlt_dE&si=...
export const BACKGROUND_MUSIC_VIDEO_ID = "uZatAYlt_dE";

export function backgroundMusicEmbedUrl(videoId: string, isMuted: boolean): string {
  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    modestbranding: "1",
    mute: isMuted ? "1" : "0",
  });
  return `${EMBED_ROOT}/${videoId}?${params.toString()}`;
}

export interface BackgroundMusic {
  readonly muted: boolean;
  setMuted: (isMuted: boolean) => void;
}

export function createBackgroundMusic(root: HTMLElement, videoId: string): BackgroundMusic {
  let isMuted = true;
  const iframe = document.createElement("iframe");
  iframe.className = "background-music__frame";
  iframe.allow = "autoplay";
  iframe.title = "Nhạc nền";
  iframe.src = backgroundMusicEmbedUrl(videoId, isMuted);
  root.append(iframe);

  return {
    get muted() {
      return isMuted;
    },
    setMuted(next) {
      if (next === isMuted) return;
      isMuted = next;
      iframe.src = backgroundMusicEmbedUrl(videoId, isMuted);
    },
  };
}

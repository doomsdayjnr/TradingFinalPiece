"use client";

import { useEffect, useRef, useState } from "react";

export function WatchVideo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const player = video.current;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    // Native controls remain available if the browser declines autoplay.
    void player?.play().catch(() => {});
    return () => {
      player?.pause();
      modal?.close();
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" className="dark-btn" onClick={() => setOpen(true)}>
        Watch Video
      </button>
      <dialog ref={dialog} className="video-dialog" aria-labelledby="video-title"
        onClose={() => setOpen(false)} onCancel={() => setOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="video-dialog-content">
          <header className="video-dialog-header">
            <h2 id="video-title">TFP Edge</h2>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </header>
          <video ref={video} controls playsInline preload="none" aria-label="TFP Edge video"
            onError={() => setFailed(true)}>
            <source src="/assets/video/tfp-edge.mp4" type="video/mp4" onError={() => setFailed(true)} />
          </video>
          {failed && <p role="alert" className="video-error">
            The video could not be played. <a href="/assets/video/tfp-edge.mp4">Open the video directly</a>.
          </p>}
        </div>
      </dialog>
    </>
  );
}

import React, { useEffect, useState } from 'react';
const channelUrl = 'https://www.youtube.com/@Chasing606/videos';
export default function LatestVideo() {
  const [video, setVideo] = useState(null);
  const [status, setStatus] = useState('loading');
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/latest-video', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then(data => { if (!/^[\w-]{11}$/.test(data.id) || typeof data.title !== 'string') throw new Error('Invalid video'); setVideo(data); setStatus('ready'); })
      .catch(error => { if (error.name !== 'AbortError') setStatus('unavailable'); });
    return () => controller.abort();
  }, []);
  return <section className="latest-video" id="watch" aria-labelledby="latest-title">
    <div className="video-heading"><p className="eyebrow">CHASING 606 · ON FILM</p><h2 id="latest-title">Follow the next chapter.</h2><p>Quiet mornings. Fresh sign. The pursuit of suburban giants.</p></div>
    <div className="video-frame">
      {video && playing ? <iframe title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> : video ? <button className="video-poster" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`}><img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/Picture1.jpg"; }}/><span className="video-play">▶︎</span><span className="poster-label">WATCH THE NEWEST UPLOAD</span></button> : <a className="video-poster video-fallback" href={channelUrl} target="_blank" rel="noreferrer"><span className="video-play">↗︎</span><span className="poster-label">EXPLORE THE LATEST HUNTS ON YOUTUBE</span></a>}
    </div>
    <div className="video-caption"><div><p className="eyebrow">{video ? 'LATEST UPLOAD' : 'FROM THE FIELD'}</p><h3>{video ? video.title : 'The hunt continues.'}</h3>{status === 'loading' && <p role="status">Finding the latest upload…</p>}{status === 'unavailable' && <p>Catch Austin’s newest upload on the channel.</p>}</div><a className="text-link" href={video ? `https://www.youtube.com/watch?v=${video.id}` : channelUrl} target="_blank" rel="noreferrer">{video ? 'WATCH ON YOUTUBE' : 'VISIT THE CHANNEL'} ↗︎</a></div>
  </section>;
}

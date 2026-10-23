import { useEffect, useState } from 'react';
import fallbackPoster from '../../assets/images/hero-hunt.webp';
import { SITE } from '../../config/site';
import Icon from '../ui/Icon';
import './LatestVideo.css';

const THUMBNAILS = ['maxresdefault', 'hqdefault'];

function useLatestVideo() {
  const [state, setState] = useState({ status: 'loading', video: null });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/latest-video', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unavailable');
        return response.json();
      })
      .then(video => {
        if (!/^[\w-]{11}$/.test(video.id) || typeof video.title !== 'string') throw new Error('Invalid video');
        setState({ status: 'ready', video });
      })
      .catch(error => { if (error.name !== 'AbortError') setState({ status: 'unavailable', video: null }); });
    return () => controller.abort();
  }, []);
  return state;
}

function Poster({ video, onPlay }) {
  // Try the largest thumbnail first, then fall back to the one every video has.
  const [thumbnail, setThumbnail] = useState(0);
  return (
    <button type="button" className="video-poster" onClick={onPlay} aria-label={`Watch the newest upload: ${video.title}`}>
      {thumbnail < THUMBNAILS.length && (
        <img src={`https://i.ytimg.com/vi/${video.id}/${THUMBNAILS[thumbnail]}.jpg`} alt="" loading="lazy" onError={() => setThumbnail(thumbnail + 1)} />
      )}
      <span className="video-play"><Icon name="play" /></span>
      <span className="video-poster__label">Watch the newest upload</span>
    </button>
  );
}

export default function LatestVideo() {
  const { status, video } = useLatestVideo();
  const [playing, setPlaying] = useState(false);

  return (
    <section className="latest-video" id="watch" aria-labelledby="latest-title">
      <div className="section-heading section-heading--dark">
        <p className="eyebrow">Chasing 606 · On film</p>
        <h2 id="latest-title">Watch the latest hunt.</h2>
        <p>New videos from the woods in eastern Kentucky.</p>
      </div>

      <div className="video-frame">
        {video && playing ? (
          <iframe
            title={video.title}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : video ? (
          <Poster video={video} onPlay={() => setPlaying(true)} />
        ) : (
          <a className="video-poster video-poster--fallback" href={SITE.youtubeVideosUrl} target="_blank" rel="noreferrer" style={{ '--poster': `url(${fallbackPoster})` }}>
            <span className="video-play"><Icon /></span>
            <span className="video-poster__label">Explore the latest hunts on YouTube</span>
          </a>
        )}
      </div>

      <div className="video-caption">
        <div>
          <p className="eyebrow">{video ? 'Latest upload' : 'From the field'}</p>
          <h3>{video ? video.title : 'Watch Chasing 606 on YouTube.'}</h3>
          {status === 'loading' && <p role="status">Finding the latest upload…</p>}
          {status === 'unavailable' && <p>Check out our newest videos on the channel.</p>}
        </div>
        <a className="text-link" href={video ? `https://www.youtube.com/watch?v=${video.id}` : SITE.youtubeVideosUrl} target="_blank" rel="noreferrer">
          {video ? 'WATCH ON YOUTUBE' : 'VISIT THE CHANNEL'} <Icon />
        </a>
      </div>
    </section>
  );
}

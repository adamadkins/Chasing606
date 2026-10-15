import React, { useState } from 'react';
import Icon from './Icon';
export default function Brand({ small = false }) {
  const [loaded, setLoaded] = useState(false);
  return <span className={`brand${small ? ' small' : ''}${loaded ? ' has-logo' : ''}`}>
    <img className="brand-logo" src="/logo.png" alt={loaded ? 'Chasing 606' : ''} onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} style={{ display:loaded ? 'block' : 'none' }}/>
    {!loaded && <><span className="mountains"><Icon name="mark"/></span><span>CHASING <b>606</b><small>ROOTED IN THE HUNT</small></span></>}
  </span>;
}

import React from 'react';
export default function Icon({ name = 'arrow', className = '' }) {
  const paths = {
    bag: <><path d="M5 7h14l1 14H4Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    arrow: <path d="M5 19 19 5M5 5h14v14"/>,
    down: <path d="M12 3v18m-7-7 7 7 7-7"/>,
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>,
    menu: <><path d="M3 7h18M3 17h18"/><path d="M8 12h13"/></>,
    close: <path d="m5 5 14 14M5 19 19 5"/>,
    mark: <><path d="m12 21-3-6-5-4L2 6m7 9L7 8V2m0 6L3 4m9 17 3-6 5-4 2-5m-7 9 2-7V2m0 6 4-4"/></>,
  };
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name] ?? paths.arrow}</svg>;
}

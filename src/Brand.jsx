import React from 'react';
export default function Brand({ small = false, header = false }) {
  return <span className={`brand has-logo${small ? ' small' : ''}`}>
    <img className="brand-logo" src="/logo.png" alt="Chasing 606" width="3100" height="3356" decoding="async"/>
  </span>;
}

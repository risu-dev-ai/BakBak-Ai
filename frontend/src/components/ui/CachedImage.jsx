// ============================================================
// BakBak Chat - Modular Image Caching Utility (Cache Storage API)
// File: frontend/src/components/ui/CachedImage.jsx
// ============================================================

import React, { useState, useEffect } from 'react';

const CACHE_NAME = 'bakbak-image-cache';

export default function CachedImage({ src, alt, className, style, ...props }) {
  const [imgSrc, setImgSrc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setImgSrc('');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadImage = async () => {
      try {
        // Open the client-side Cache Storage
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(src);

        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setImgSrc(objectUrl);
            setLoading(false);
          }
          return;
        }

        // Fetch the image from network if not cached yet
        const response = await fetch(src);
        if (!response.ok) throw new Error('Image fetch failed');

        // Put a clone of the network response in Cache Storage
        await cache.put(src, response.clone());

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setImgSrc(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Image cache fetch failed, falling back to network url:', err);
        if (isMounted) {
          setImgSrc(src); // Fallback to raw CDN URL
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      // Revoke the object URL to release browser memory if it starts with blob:
      if (imgSrc && imgSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div 
        className={`bg-white/5 animate-pulse rounded-2xl ${className}`} 
        style={{ ...style, minWidth: '32px', minHeight: '32px' }}
      />
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      style={style} 
      {...props} 
    />
  );
}

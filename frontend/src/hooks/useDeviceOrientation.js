import { useState, useEffect } from 'react';

/**
 * Hook para monitorear orientación y dimensiones del viewport en dispositivos móviles
 */
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { orientation, dimensions, isPortrait: orientation === 'portrait' };
}

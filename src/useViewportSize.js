import { useEffect, useState } from 'react';

const measure = () => ({ width: window.innerWidth, height: window.innerHeight });

// The window's size, kept up to date
const useViewportSize = () => {
  const [size, setSize] = useState(measure);

  useEffect(() => {
    const update = () => setSize(measure());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
};

export default useViewportSize;

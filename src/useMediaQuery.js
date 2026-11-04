import { useEffect, useState } from 'react';

const matches = (query) => Boolean(window.matchMedia?.(query).matches);

// Whether a CSS media query matches, kept up to date
const useMediaQuery = (query) => {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setIsMatch(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return isMatch;
};

export default useMediaQuery;

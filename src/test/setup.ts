import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest.config.ts doesn't set `test.globals`, so Testing Library's automatic
// afterEach cleanup (which detects a global `afterEach`) never registers —
// do it explicitly so renders don't leak between tests in the same file.
afterEach(() => {
  cleanup();
});

// next-themes and useMediaQuery rely on matchMedia, absent from jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

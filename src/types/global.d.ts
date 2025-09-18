/**
 * Global type declarations for browser environment
 */

import { gsap } from 'gsap';

declare global {
  interface Window {
    gsap: typeof gsap;
  }
}

export {};

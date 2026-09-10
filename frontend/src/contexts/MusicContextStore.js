import { createContext, useContext } from 'react';

export const MusicContext = createContext(null);

export function useMusic() {
  return useContext(MusicContext);
}

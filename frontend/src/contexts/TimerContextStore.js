import { createContext, useContext } from 'react';

export const TimerContext = createContext(null);

export function useTimer() {
  return useContext(TimerContext);
}

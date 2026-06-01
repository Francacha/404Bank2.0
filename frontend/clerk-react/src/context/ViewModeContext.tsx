import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ViewMode = 'work' | 'client';

const ViewModeContext = createContext<{
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}>({
  viewMode: 'work',
  setViewMode: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (sessionStorage.getItem('viewMode') as ViewMode) || 'work';
  });

  const setViewMode = (mode: ViewMode) => {
    sessionStorage.setItem('viewMode', mode);
    setViewModeState(mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}

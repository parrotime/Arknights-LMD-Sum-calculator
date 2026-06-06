import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

interface CursorContextValue {
  isCalculating: boolean;
  setCalculating: Dispatch<SetStateAction<boolean>>;
}

const CursorContext = createContext<CursorContextValue>({
  isCalculating: false,
  setCalculating: () => {},
});

interface CursorProviderProps {
  children: ReactNode;
}

export const CursorProvider = ({ children }: CursorProviderProps) => {
  const [isCalculating, setCalculating] = useState(false);
  return (
    <CursorContext.Provider value={{ isCalculating, setCalculating }}>
      {children}
    </CursorContext.Provider>
  );
};

export const useCursorState = () => useContext(CursorContext);

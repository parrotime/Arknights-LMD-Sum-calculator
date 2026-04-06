import { createContext, useContext, useState, useCallback } from "react";

const CursorContext = createContext({
  isCalculating: false,
  setCalculating: () => {},
});

export const CursorProvider = ({ children }) => {
  const [isCalculating, setCalculating] = useState(false);
  return (
    <CursorContext.Provider value={{ isCalculating, setCalculating }}>
      {children}
    </CursorContext.Provider>
  );
};

export const useCursorState = () => useContext(CursorContext);

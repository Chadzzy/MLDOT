import { createContext, useContext } from "react";
export const JourneyContext = createContext(null);
export const useJourney = () => useContext(JourneyContext);

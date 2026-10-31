// ResponsiveModeProvider.tsx
import {createContext, PropsWithChildren, useContext, useEffect, useState} from "react";
import {MOBILE_BREAKPOINT_PX} from "@/platform/global-data";


const ResponsiveModeCtx = createContext(false);

export function ResponsiveModeProvider({children}: PropsWithChildren) {
    const isMobile = useIsMobileSync()
    return (
        <ResponsiveModeCtx.Provider value={isMobile}>
            {children}
        </ResponsiveModeCtx.Provider>
    );
}

export function useIsMobile() {
    return useContext(ResponsiveModeCtx);
}

export function useIsMobileSync(breakpoint = MOBILE_BREAKPOINT_PX) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);

    return isMobile;
}
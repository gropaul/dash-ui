


// ResponsiveModeProvider.tsx
import {createContext, useContext, PropsWithChildren, useState, useEffect} from "react";


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

export function useIsMobileSync(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);

    return isMobile;
}
import {createWithEqualityFn} from "zustand/traditional";

const STORAGE_KEY = 'dash-onboarding-seen';

function getHasSeenWelcome(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function setHasSeenWelcome() {
    try {
        localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
}

export interface OnboardingZustand {
    hasSeenWelcome: boolean;
    isTourOpen: boolean;
    currentSlide: number;

    openWelcomeTour: () => void;
    closeTour: () => void;
    setCurrentSlide: (slide: number) => void;
    completeTour: () => void;
    markAsSeen: () => void;
}

export const useOnboardingState = createWithEqualityFn<OnboardingZustand>((set, get) => ({
    hasSeenWelcome: getHasSeenWelcome(),
    isTourOpen: false,
    currentSlide: 0,

    openWelcomeTour: () => {
        if (get().isTourOpen) return;
        set({isTourOpen: true, currentSlide: 0});
    },

    closeTour: () => {
        set({isTourOpen: false, currentSlide: 0});
    },

    setCurrentSlide: (slide: number) => {
        set({currentSlide: slide});
    },

    completeTour: () => {
        setHasSeenWelcome();
        set({hasSeenWelcome: true, isTourOpen: false, currentSlide: 0});
    },

    markAsSeen: () => {
        setHasSeenWelcome();
        set({hasSeenWelcome: true});
    }
}));

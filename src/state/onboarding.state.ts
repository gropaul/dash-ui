import {createWithEqualityFn} from "zustand/traditional";
import {persist} from "zustand/middleware";

export interface OnboardingZustand {
    hasSeenWelcome: boolean;
    isTourOpen: boolean;
    currentSlide: number;

    openTour: () => void;
    closeTour: () => void;
    setCurrentSlide: (slide: number) => void;
    completeTour: () => void;
}

export const useOnboardingState = createWithEqualityFn(persist<OnboardingZustand>((set) => ({
    hasSeenWelcome: false,
    isTourOpen: false,
    currentSlide: 0,

    openTour: () => {
        set({isTourOpen: true, currentSlide: 0});
    },

    closeTour: () => {
        set({isTourOpen: false, currentSlide: 0});
    },

    setCurrentSlide: (slide: number) => {
        set({currentSlide: slide});
    },

    completeTour: () => {
        set({hasSeenWelcome: true, isTourOpen: false, currentSlide: 0});
    },
}), {
    name: 'dash-onboarding',
    partialize: (state) => ({hasSeenWelcome: state.hasSeenWelcome}) as OnboardingZustand,
}));

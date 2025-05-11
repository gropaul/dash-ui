import {InputManager} from "@/components/editor/inputs/register-inputs";

export interface InputValue {
    value: any;
}

export interface InputDependency {
    blockId: string;
    inputName: string;
    //! Call this function if the input value changes!
    callFunction: (inputValue: InputValue) => Promise<any>;
}

export interface RegisterInputManagerParams {
    blockId: string;
    inputManager: InputManager;
}

//! Interface for all input consumer tools
export interface InputConsumerTool {
    //! Get all dependencies for this input consumer via a callback function
    registerInputManager: (params: RegisterInputManagerParams) => void;
}

export interface InputSource {
    inputName: string;
}

export type InputNotifyFunction = (inputName: string, inputValue: InputValue) => void;


export interface InputProducerTool {
    registerInputManager: (params: RegisterInputManagerParams) => void;
}
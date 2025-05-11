export interface InputValue {
    value: any;
}

export interface InputDependency {
    blockId: string;
    inputName: string;
    //! Call this function if the input value changes!
    callFunction: (inputValue: InputValue) => Promise<any>;
}

export interface InputSource {
    blockId: string;
    inputName: string;
    inputValue: InputValue;
}

export interface InputSource {
    inputName: string;
}

export type InputNotifyFunction = (inputName: string, inputValue: InputValue) => void;

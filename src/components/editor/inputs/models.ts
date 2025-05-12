export interface InputValue {
    value: any;
}

export interface InputDependency {
    blockId: string;
    inputName: string;
    //! Call this function if the input value changes!
    callFunction: (inputValue: InputValue) => Promise<any>;
}

export function dependenciesAreEqual(
    dependency1: InputDependency,
    dependency2: InputDependency
): boolean {
    return (
        dependency1.blockId === dependency2.blockId &&
        dependency1.inputName === dependency2.inputName
    );
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

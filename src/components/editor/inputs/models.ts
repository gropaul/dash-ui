export interface InputValue {
    value: any;
}

export interface InputDependency {
    blockId: string;
    inputName: string;
    //! Call this function if the input value changes!
    callFunction: (inputValue: InputValue) => Promise<any>;
}

export interface GetDependenciesParams {
    blockId: string;
    callback: (dependencies: InputDependency[]) => void;
}

//! Interface for all input consumer tools
export interface InputConsumerTool {
    //! Get all dependencies for this input consumer via a callback function
    getDependencies: (params: GetDependenciesParams) => void;
    setInputValue: (inputName: string, inputValue: InputValue) => void;
}

export interface InputSource {
    inputName: string;
}

export type InputNotifyFunction = (inputName: string, inputValue: InputValue) => void;

export interface GetSourcesParams {
    blockId: string;
    callback: (sources: InputSource[]) => void;
    notifyOnChange: InputNotifyFunction
}

export interface InputProducerTool {
    getSources: (params: GetSourcesParams) => void;
}
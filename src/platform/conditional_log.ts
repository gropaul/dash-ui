


export function conditionalLog(condition: boolean, ...args: any[]) {
    if (condition) {
        console.log(...args);
    }
}

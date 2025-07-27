let logs = [];

const recordLog = (args) => {
    logs.push(args);
}

(()=>{
    const originalConsole = {
        log: console.log,
        debug: console.debug,
        warn: console.warn,
        error: console.error,
        info: console.info,
        trace: console.trace
    };

    Object.keys(originalConsole).forEach(level => {
        if (originalConsole[level]) {
            console[level] = (...args) => {
                recordLog(args);
                originalConsole[level](...args);
            }
        }
    });
})();
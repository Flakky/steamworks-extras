// Override console methods to add a prefix to the output
(() => {
    const colors: Record<string, string> = {
        log: '#4CAF50',
        debug: '#2196F3',
        warn: '#FF9800',
        error: '#F44336',
        info: '#00BCD4',
        trace: '#9C27B0'
    };
    const originalConsole: any = {
        log: console.log,
        debug: console.debug,
        warn: console.warn,
        error: console.error,
        info: console.info,
        trace: console.trace
    };

    Object.keys(colors).forEach(level => {
        if (originalConsole[level]) {
            const color: string = colors[level] || colors.log;
            const prefix = `[Steamworks Extras | ${level.charAt(0).toUpperCase() + level.slice(1)}]`;
            const prefixArgs = [`%c${prefix}%c`, `color: ${color}; font-weight: bold;`, 'color: inherit;'];
            console[level as keyof Console] = originalConsole[level].bind(console, ...prefixArgs);
        }
    });
})();

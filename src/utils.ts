export function range(start: number, stop: number, step: number) {
    return Array.from(
        {length: (stop - start) / step + 1, },
        (_value, index) => start + index * step
    );
}

export function requireHasValue<T>(arg: T | undefined | null): T {
    if (arg === null || arg === undefined)
        throw Error("expected non-undefined non-null value");
    return arg;
}

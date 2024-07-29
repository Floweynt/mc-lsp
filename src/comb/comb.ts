// parser combinators 

import {ParseResultReporter} from "../args/argument";
import {SemanticTokenType} from "../sem";
import {RangeString, sliceLenRange, sliceRange} from "../tok";

export interface CombContext {
    data: {[key: string]: RangeString};
}

// remaining, success 
// NOTE: success only indicates if we should keep parsing, not if an error has occurred
export type ParserComb = (report: ParseResultReporter, str: RangeString, context: CombContext) => [RangeString, boolean];

export function withParsed(
    p: ParserComb,
    consumer: (report: ParseResultReporter, consumedStr: RangeString, context: CombContext) => void,
    shouldEmitOnFail: boolean = true
): ParserComb {
    return (report, str, context) => {
        const [remaining, success] = p(report, str, context);
        if (shouldEmitOnFail || success) {
            consumer(report, remaining.slice(0, remaining.end()), context);
        }

        // pass the result 
        return [remaining, success];
    };
}

export function emitSemanticToken(p: ParserComb, type: SemanticTokenType, shouldEmitOnFail: boolean = true): ParserComb {
    return withParsed(p, (report, str) => {
        report.token(str, type);
    }, shouldEmitOnFail);
}

export function recover(p: ParserComb, recovery: (str: RangeString) => RangeString): ParserComb {
    return (report, str, context) => {
        const [remaining, success] = p(report, str, context);
        if (!success) {
            // return true to indicate we should continue parsing 
            return [recovery(remaining), true];
        }

        return [remaining, success];
    };
}

export function recoverToMatching(p: ParserComb, match: RegExp): ParserComb {
    return recover(p, (str: RangeString) => {
        let index = 0;
        while (index < str.length() && !match.test(str.str().charAt(index))) {
            index++;
        }

        return str.slice(index);
    });
}

export function chain(exitOnEmpty: boolean, ...p: ParserComb[]): ParserComb {
    return (report, str, context) => {
        for (const parser of p) {
            const [remaining, success] = parser(report, str, context);
            if (!success) {
                return [remaining, false];
            }

            str = remaining;

            if (str.length() == 0 && exitOnEmpty) {
                return [str, true];
            }
        }

        return [str, true];
    };
}

export function parseIf(p: ParserComb, predicate: (str: RangeString) => boolean): ParserComb {
    return (report, str, context) => {
        if (!predicate(str)) {
            return [str, true];
        }

        return p(report, str, context);
    };
}

export function skipIfFail(p: ParserComb): ParserComb {
    return (report, str, context) => {
        const [result, success] = p(report, str, context);
        if (!success) {
            return [str, true];
        }

        return [result, success];
    };
}

export function consumeIf(p: ParserComb, prefix: string): ParserComb {
    return (report, str, context) => {
        if (str.str().startsWith(prefix)) {
            return p(report, str.slice(prefix.length), context);
        }
        return p(report, str, context);
    };
}

export function storeTo(p: ParserComb, name: string, shouldEmitOnFail: boolean = true): ParserComb {
    return withParsed(p, (_, str, context) => {
        context.data[name] = str;
    }, shouldEmitOnFail);
}

export function expectEmpty(p: ParserComb, message: string): ParserComb {
    return (report, str, context) => {
        const [remaining, success] = p(report, str, context);
        if (success) {
            if (remaining.length() != 0) {
                report.err(remaining, message);
            }
        }

        return [remaining, success];
    };
}

export function expectPrefix(p: ParserComb, prefix: string, message: string): ParserComb {
    return (report, str, context) => {
        if (!str.str().startsWith(message))
            report.err(sliceLenRange(str.range(), 0, message.length), message);

        return p(report, str.slice(prefix.length), context);
    };
}

export function consumeWhile(
    predicate: (ch: string) => boolean,
    validation: (report: ParseResultReporter, str: RangeString) => boolean = () => true
): ParserComb {
    return (report, str) => {
        let index = 0;
        while (index < str.length() && predicate(str.str().charAt(index))) {
            index++;
        }

        return [str.slice(index), validation(report, str.slice(0, index))];
    };
}

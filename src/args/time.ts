import {SemanticTokenType} from "../sem";
import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, takeWhile} from "./argument";

interface TimeParameter {
    min: number;
}

export class TimeArgument implements ArgumentParser {
    public readonly min: number;

    private static readonly KNOWN_UNITS: {[key: string]: number} = {
        "d": 24000,
        "s": 20,
        "t": 1,
        "": 1,
    };

    public constructor(params: object) {
        this.min = (params as TimeParameter).min ?? 0;
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        const [valueStr, suffix] = takeWhile(arg.value, c => c >= '0' && c <= '9');

        if (valueStr.length() == 0) {
            return res.err(arg.value, "TimeArgument: expected number optionally followed by units");
        }

        const value = Number.parseInt(valueStr.str());


        res.token(valueStr, SemanticTokenType.NUMBER);
        res.token(suffix, SemanticTokenType.UNITS);

        if (!Number.isFinite(value) || Number.isNaN(value)) {
            return res.err(valueStr, `TimeArgument: failed to parse integer ${value}`);
        }

        const unitMultiplier = TimeArgument.KNOWN_UNITS[suffix.str()];

        if (unitMultiplier == undefined) {
            return res.err(
                suffix,
                `TimeArgument: unknown unit '${suffix}', allowed values are 'd' (day), 's' (second), 't' (tick)`
            );
        }

        const time = value * unitMultiplier;

        if (time < this.min) {
            res.err(arg.value, `TimeArgument: a minimum of ${this.min} ticks was expected, but got ${time}`);
        }

        return res;
    }


    public suggest(input: TokenReader): string[] {
        return [];
    }
}


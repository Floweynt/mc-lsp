import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";
import {RangeSpec, parseRange} from "./misc";

export class NumberRangeParser implements ArgumentParser {
    private readonly spec: RangeSpec;

    public constructor(isInteger: boolean) {
        this.spec = {
            isInt: isInteger,
            allowNegative: true,
            err: {
                failedParseNum: "NumberRange: failed to parse number",
                missingBounds: "NumberRange: range cannot be just '..'",
                tooManyComponents: "NumberRange: only one '..' expected",
            },
        };
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const ret = new ArgParseResult;
        parseRange(input.consume().value, this.spec, ret);
        return ret;
    }

    public suggest(_input: TokenReader): string[] {
        return [];
    }
}

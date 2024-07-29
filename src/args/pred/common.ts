import {SemanticTokenType} from "../../sem";
import {RangeString, sliceLenRange} from "../../tok";
import {ArgumentParser, ExampleEntry, ParseResultReporter} from "../argument";
import {RangeSpec, parseNumber, parseRange} from "../misc";

export interface PredicateValueParser {
    parse: (str: RangeString, res: ParseResultReporter) => void;
    readonly allowEmpty: boolean;
}

export class FloatPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["0", "1234", "+12.34"];

    public parse(str: RangeString, res: ParseResultReporter) {
        parseNumber(str, {
            isInt: false,
            err: {
                parseFail: "failed to parse float",
            },
        }, res);
    }

    allowEmpty = false;
}

export class PositiveIntPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["0", "1234", "+12.34"];

    public parse(str: RangeString, res: ParseResultReporter) {
        parseNumber(str, {
            isInt: true,
            min: 0,
            err: {
                parseFail: "failed to parse float",
                belowMin: () => "expected non-negative integer",
            },
        }, res);
    }

    allowEmpty = false;
}

export class FloatRangePredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["0", "12", "12..34", "..12", "12..", "1.4..2.3"];
    private readonly spec: RangeSpec;

    public constructor(allowNegative: boolean) {
        this.spec = {
            isInt: false,
            allowNegative: allowNegative,
            err: {
                failedParseNum: "failed to parse float",
                missingBounds: "range cannot be just '..'",
                tooManyComponents: "too many components in range, only one '..' is allowed",
                negativeNum: () => "value cannot be negative",
            },
        };
    }

    public parse(str: RangeString, res: ParseResultReporter) {
        parseRange(str, this.spec, res);
    }

    allowEmpty = false;
}

export class IntRangePredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["0", "12", "12..34", "..12", "12.."];
    private readonly spec: RangeSpec;

    public constructor(allowNegative: boolean) {
        this.spec = {
            isInt: true,
            allowNegative: allowNegative,
            err: {
                failedParseNum: "failed to parse integer",
                missingBounds: "range cannot be just '..'",
                tooManyComponents: "too many components in range, only one '..' is allowed",
                negativeNum: () => "value cannot be negative",
            },
        };
    }

    public parse(str: RangeString, res: ParseResultReporter) {
        parseRange(str, this.spec, res);
    }

    allowEmpty = false;
}

export interface PredicateParser {
    factory: (params: object) => ArgumentParser;
    sample?: ExampleEntry[];
}

export class StringWithNegationPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["a", "b", "!a", "!"];
    public allowEmpty: boolean;
    private readonly valueValidation: (str: RangeString, res: ParseResultReporter) => void;
    private readonly tokenType?: SemanticTokenType;

    public constructor(allowEmpty: boolean, valueValidation: (str: RangeString, res: ParseResultReporter) => void, tokenType?: SemanticTokenType) {
        this.allowEmpty = allowEmpty;
        this.valueValidation = valueValidation;
        this.tokenType = tokenType;
    }

    public parse(str: RangeString, res: ParseResultReporter) {
        if (str.str().startsWith("!")) {
            res.token(sliceLenRange(str.range(), 0, 1), SemanticTokenType.OPERATOR);
            str = str.slice(1);
        }

        if (!this.allowEmpty && str.length() == 0) {
            res.err(str, "empty ! not allowed");
        }

        this.valueValidation(str, res);
        if (this.tokenType)
            res.token(str, this.tokenType);
    }
}

export class SimpleStringPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["a", "b"];
    public allowEmpty: boolean;
    private readonly valueValidation: (str: RangeString, res: ParseResultReporter) => void;
    private readonly tokenType: SemanticTokenType;

    public constructor(allowEmpty: boolean, valueValidation: (str: RangeString, res: ParseResultReporter) => void, tokenType: SemanticTokenType) {
        this.allowEmpty = allowEmpty;
        this.valueValidation = valueValidation;
        this.tokenType = tokenType;
    }

    public parse(str: RangeString, res: ParseResultReporter) {
        this.valueValidation(str, res);
        res.token(str, this.tokenType);
    }
}

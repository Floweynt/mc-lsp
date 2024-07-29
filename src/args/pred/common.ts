import {SemanticTokenType} from "../../sem";
import {RangeString, sliceLenRange} from "../../tok";
import {ArgumentParser, ExampleEntry, ParseResultReporter} from "../argument";
import {RangeSpec, parseNumber, parseRange} from "../misc";

export interface PredicateValueParser {
    parse: (str: RangeString, reporter: ParseResultReporter) => void;
    readonly allowEmpty: boolean;
}

export class FloatPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["0", "1234", "+12.34"];

    public parse(str: RangeString, reporter: ParseResultReporter) {
        parseNumber(str, {
            isInt: false,
            err: {
                parseFail: "failed to parse float",
            },
        }, reporter);
    }

    allowEmpty = false;
}

export class PositiveIntPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["0", "1234", "+12.34"];

    public parse(str: RangeString, reporter: ParseResultReporter) {
        parseNumber(str, {
            isInt: true,
            min: 0,
            err: {
                parseFail: "failed to parse float",
                belowMin: () => "expected non-negative integer",
            },
        }, reporter);
    }

    allowEmpty = false;
}

export class FloatRangePredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["0", "12", "12..34", "..12", "12..", "1.4..2.3"];
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

    public parse(str: RangeString, reporter: ParseResultReporter) {
        parseRange(str, this.spec, reporter);
    }

    allowEmpty = false;
}

export class IntRangePredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["0", "12", "12..34", "..12", "12.."];
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

    public parse(str: RangeString, reporter: ParseResultReporter) {
        parseRange(str, this.spec, reporter);
    }

    allowEmpty = false;
}

export interface PredicateParser {
    factory: (params: object) => ArgumentParser;
    sample?: ExampleEntry[];
}

export class StringWithNegationPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["a", "b", "!a", "!"];
    public readonly allowEmpty: boolean;
    private readonly validation: (str: RangeString, reporter: ParseResultReporter) => void;
    private readonly tokenType?: SemanticTokenType;

    public constructor(allowEmpty: boolean, validation: (str: RangeString, reporter: ParseResultReporter) => void, tokenType?: SemanticTokenType) {
        this.allowEmpty = allowEmpty;
        this.validation = validation;
        this.tokenType = tokenType;
    }

    public parse(str: RangeString, reporter: ParseResultReporter) {
        if (str.str().startsWith("!")) {
            reporter.token(sliceLenRange(str.range(), 0, 1), SemanticTokenType.OPERATOR);
            str = str.slice(1);
        }

        if (!this.allowEmpty && str.length() == 0) {
            reporter.err(str, "empty ! not allowed");
        }

        this.validation(str, reporter);
        if (this.tokenType)
            reporter.token(str, this.tokenType);
    }
}

export class SimpleStringPredicate implements PredicateValueParser {
    public static readonly EXAMPLES: readonly string[] = ["a", "b"];
    public readonly allowEmpty: boolean;
    private readonly validation: (str: RangeString, reporter: ParseResultReporter) => void;
    private readonly tokenType: SemanticTokenType;

    public constructor(allowEmpty: boolean, validation: (str: RangeString, reporter: ParseResultReporter) => void, tokenType: SemanticTokenType) {
        this.allowEmpty = allowEmpty;
        this.validation = validation;
        this.tokenType = tokenType;
    }

    public parse(str: RangeString, reporter: ParseResultReporter) {
        this.validation(str, reporter);
        reporter.token(str, this.tokenType);
    }
}

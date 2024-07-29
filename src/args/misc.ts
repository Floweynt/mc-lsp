import {RangeString, sliceLenRange, splitByCh} from "../tok";

import {ArgParseResult, ParseResultReporter, UNQUOTED_STRING_REGEX} from "./argument";
import {SemanticTokenType} from "../sem";

export interface PropertySpec {
    keyRegex: RegExp;
    valueRegex: RegExp;
    allowEmptyKey: boolean;
    allowEmptyValue: boolean;
    keyTokType: SemanticTokenType;

    err: {
        unclosed: string;
        badKey: string;
        badValue: string;
        emptyKey: string;
        emptyValue: string;
        noEq: string;
        extraComma: string;
    };
}

export function parseProperties(
    data: RangeString,
    res: ParseResultReporter,
    spec: PropertySpec,
    re: RegExp = /^\[([^[{]*)\](.*)$/
) {
    const match = data.match(re);
    if (match == null) {
        res.err(data, spec.err.unclosed);
        return;
    }

    if (match[1]?.length() == 0) {
        return;
    }

    const parts = splitByCh(match[1]!, ",");

    return parts.map(part => {
        if (part.length() == 0) {
            res.err(data, spec.err.extraComma);
            return undefined;
        }

        return parsePropertyEntry(part, res, spec);
    }).filter(u => u != undefined) as [RangeString, RangeString][];
}

export interface PropertyEntrySpec {
    keyRegex: RegExp;
    valueRegex: RegExp;
    allowEmptyKey: boolean;
    allowEmptyValue: boolean;
    keyTokType: SemanticTokenType;

    err: {
        badKey: string;
        badValue: string;
        emptyKey: string;
        emptyValue: string;
        noEq: string;
    };
}

export function parsePropertyEntry(
    data: RangeString,
    res: ParseResultReporter,
    spec: PropertyEntrySpec
): [RangeString, RangeString] | undefined {
    data = data.trim();
    const parts = data.split("=", 2);
    if (parts.length == 1) {
        res.err(data, spec.err.noEq);
        return;
    }

    const [key, value] = parts.map(u => u.trim());

    if (key.length() == 0 && !spec.allowEmptyKey) {
        res.err(data, spec.err.emptyKey);
        return;
    }

    if (value.length() == 0 && !spec.allowEmptyValue) {
        res.err(data, spec.err.emptyValue);
        return;
    }

    if (!spec.keyRegex.test(key.str())) {
        res.err(key, spec.err.badKey);
    }

    if (!spec.valueRegex.test(value.str())) {
        res.err(key, spec.err.badValue);
    }

    if (key.length() != 0) {
        res.token(key, spec.keyTokType);
    }

    res.token(sliceLenRange(data.range(), data.str().indexOf("="), 1), SemanticTokenType.OPERATOR);
    return [key, value];
}

export interface NumberSpec {
    isInt: boolean;
    min?: number;
    max?: number;
    err: {
        parseFail: string;
        belowMin?: (x: number) => string;
        aboveMax?: (x: number) => string;
    };
}

export function parseNumber(str: RangeString, spec: NumberSpec, res: ParseResultReporter): number | undefined {
    const value = (spec.isInt ? Number.parseInt : Number.parseFloat)(str.str());
    res ??= new ArgParseResult;

    if (Number.isNaN(value) || !Number.isFinite(value)) {
        res.err(str, spec.err.parseFail);
        return;
    }

    res.token(str, SemanticTokenType.NUMBER);
    if (value < (spec.min ?? -Number.MAX_VALUE)) {
        res.err(str, spec.err.belowMin!(value));
    }

    if (value > (spec.max ?? Number.MAX_VALUE)) {
        res.err(str, spec.err.belowMin!(value));
    }

    return value;
}

export interface RangeSpec {
    isInt: boolean;
    allowNegative: boolean;
    err: {
        failedParseNum: string;
        missingBounds: string;
        tooManyComponents: string;
        negativeNum?: (x: number) => string;
    };
}

export function parseRange(str: RangeString, spec: RangeSpec, res: ParseResultReporter): [number, number] | undefined {
    const comp = str.split("..");
    const numParseSpec: NumberSpec = {
        isInt: spec.isInt,
        min: spec.allowNegative ? undefined : 0,
        err: {
            parseFail: spec.err.failedParseNum,
            belowMin: spec.allowNegative ? undefined : spec.err.negativeNum,
        },
    };

    if (comp.length == 1) {
        const val = parseNumber(str, numParseSpec, res);

        if (val != undefined)
            return [val, val];

        return;
    }

    if (comp.length > 2) {
        res.err(str, spec.err.tooManyComponents);
        return;
    }

    const [from, to] = comp;

    res.token(sliceLenRange(str.range(), from.length(), 2), SemanticTokenType.OPERATOR);

    if (from.length() == 0 && to.length() == 0) {
        res.err(str, spec.err.missingBounds);
    }

    let fromVal: number | undefined = spec.allowNegative ? -Number.MAX_VALUE : 0;
    let toVal: number | undefined = Number.MAX_VALUE;

    if (from.length()) {
        fromVal = parseNumber(from, numParseSpec, res);
    }

    if (to.length()) {
        toVal = parseNumber(to, numParseSpec, res);
    }

    if (fromVal == undefined || toVal == undefined) {
        return undefined;
    }

    return [fromVal, toVal];
}

export class StringReader {
    protected str: RangeString;
    protected res: ParseResultReporter;
    protected index: number;

    public constructor(str: RangeString, res: ParseResultReporter) {
        this.str = str;
        this.res = res;
        this.index = 0;
    }

    protected skipWhitespace() {
        while (/\s/.test(this.curr())) {
            this.consume();
        }
    }

    protected expect(ch: string, token?: SemanticTokenType): boolean {
        if (this.curr() != ch) {
            if (this.canRead()) {
                this.res.err(this.currRange(), `expected '${ch}'`);
            } else {
                this.res.err(this.str, `expected '${ch}' but got end of string`);
            }

            return false;
        }

        if (token !== undefined) {
            this.res.token(this.currRange(), token);
        }

        this.consume();
        return true;
    }

    protected curr(offset: number = 0): string {
        return this.str.charAt(this.index + offset).str();
    }

    protected currRange(offset: number = 0): RangeString {
        return this.str.charAt(this.index + offset);
    }

    protected consume() {
        this.index++;
    }

    protected canRead(val: number = 1) {
        return this.index + val <= this.str.length();
    }

    protected readUnquoted(): RangeString {
        return this.readWhile(UNQUOTED_STRING_REGEX);
    }

    protected readWhile(regex: RegExp): RangeString {
        const start = this.index;
        while (this.canRead() && regex.test(this.curr()))
            this.consume();
        return this.str.slice(start, this.index);
    }

    protected throwExpectedValue() {
        this.res.err(this.str, "expected value");
        this.stopParsing();
    }

    protected stopParsing() {
        throw "__stop_parsing";
    }

    protected consumeString() {
        const start = this.index;
        const ch = this.curr();
        do {
            if (this.curr() == "\\")
                this.index++;
            this.index++;
        } while (this.curr() != ch && this.canRead());
        this.expect(ch);
        return this.str.slice(start, this.index);
    }
}

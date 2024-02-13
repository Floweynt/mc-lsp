import {RangeString, sliceLenRange} from "../tok";

import {ArgParseResult} from "./argument";
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
    res: ArgParseResult,
    spec: PropertySpec
) {
    const match = data.match(/^\[([^[{]*)\]/);
    if (match == null) {
        res.err(data, spec.err.unclosed);
        return;
    }

    if(match[1]?.length() == 0) {
        return;
    }

    const parts = match[1]!.split(",");
    return parts.map(part => {
        if(part.length() == 0) {
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
    res: ArgParseResult,
    spec: PropertyEntrySpec
): [RangeString, RangeString] | undefined {
    const parts = data.split("=", 2);
    if (parts.length == 1) {
        res.err(data, spec.err.noEq);
        res.token(data, spec.keyTokType);
        return;
    }

    const [key, value] = parts;

    if (key.length() == 0 && !spec.allowEmptyKey) {
        res.err(data, spec.err.emptyKey);
    }

    if (value.length() == 0 && !spec.allowEmptyValue) {
        res.err(data, spec.err.emptyValue);
    }

    if (key.length() != 0) {
        res.token(key, spec.keyTokType);
    }

    res.token(sliceLenRange(data.range(), key.length(), 1), SemanticTokenType.OPERATOR);

    return [key, value];
}

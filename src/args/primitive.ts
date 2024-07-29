import {TokenReader, between} from "../tok";
import {ArgParseResult, ArgumentParser, ExampleEntry, UNQUOTED_STRING_REGEX} from "./argument";
import {SemanticTokenType} from "../sem";
import {NumberSpec, parseNumber} from "./misc";

export class StringParser implements ArgumentParser {
    private readonly type: "greedy" | "phrase" | "word";

    private static readonly EXAMPLES = {
        greedy: ["word", "words with spaces", "\"and symbols\""],
        phrase: ["\"quoted phrase\"", "word", "\"\""],
        word: ["word", "words_with_underscores"],
    };


    public constructor(params: object) {
        this.type = (params as any)["type"];
    }

    public tryParse(input: TokenReader): ArgParseResult {
        switch (this.type) {
            case "greedy": {
                const text = input.text.slice(input.current().value.start(), input.last().value.end());
                const result = new ArgParseResult();
                result.token(between(input.current(), input.last()), SemanticTokenType.STRING);
                input.index = input.tokens.length;
                return result;
            }
            case "phrase": {
                throw Error("not impl");
            }
            case "word": {
                const token = input.consume();
                const res = new ArgParseResult();
                if (!UNQUOTED_STRING_REGEX.test(token.value.str())) {
                    res.err(token, "StringArgument(word): illegal character in word; it should match [a-zA-Z0-9_.+-]+");
                }
                res.token(token, SemanticTokenType.STRING);
                return res;
            }
        }
    }

    public suggest(_input: TokenReader): string[] {
        return [];
    }

    public examples() {
        return StringParser.EXAMPLES[this.type].map<ExampleEntry>(u => [u, this.type]);
    }
}

export interface NumberPropertyParams {
    min: number;
    max: number;
}

export class NumberParser implements ArgumentParser {
    private readonly spec: NumberSpec;

    private getName() {
        return this.spec.isInt ? "IntegerArgument" : "FloatArgument";
    }

    private static getName(isInt: boolean) {
        return isInt ? "IntegerArgument" : "FloatArgument";
    }

    public constructor(isInteger: boolean, params: NumberPropertyParams) {
        this.spec = {
            isInt: isInteger,
            max: params.max,
            min: params.min,
            err: {
                parseFail: `${NumberParser.getName(isInteger)}: failed to parse number`,
                belowMin: value => `${this.getName()}: ${value} is below the minimum of ${this.spec.min}`,
                aboveMax: value => `${this.getName()}: ${value} exceeds maximum of ${this.spec.min}`,
            },
        };
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const ret = new ArgParseResult;
        parseNumber(input.consume().value, this.spec, ret);
        return ret;
    }

    public suggest(_input: TokenReader): string[] {
        return [];
    }
}

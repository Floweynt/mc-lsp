import {TokenReader, between} from "../tok";
import {ArgParseResult, ArgumentParser, ExampleEntry} from "./argument";
import {SemanticTokenType} from "../sem";

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
                if (!/[a-zA-Z_.+-]+/.test(token.value.str())) {
                    res.err(token.value.range(), "StringArgument(word): illegal character in word; it should match [a-zA-Z0-9_.+-]+");
                }
                res.token(token.value, SemanticTokenType.STRING);
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

export class NumberParser implements ArgumentParser {
    private readonly isInteger: boolean;
    private readonly range: [number, number];

    private getName() {
        return this.isInteger ? "IntegerArgument" : "FloatArgument";
    }

    public constructor(isInteger: boolean, params: object) {
        this.isInteger = isInteger;
        this.range = [(params as any).min ?? -Number.MAX_VALUE, (params as any).max ?? Number.MAX_VALUE];
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const token = input.consume();

        const value = (this.isInteger ? Number.parseInt : Number.parseFloat)(token.value.str());
        res.token(token.value, SemanticTokenType.NUMBER);

        if(Number.isNaN(value) || !Number.isFinite(value)) {
            return res.err(token.value, `${this.getName()}: failed to parse number`);
        }

        if(value > this.range[1]) {
            return res.err(token.value, `${this.getName()}: ${value} exceeds maximum of ${this.range[1]}`);
        }

        if(value < this.range[0]) {
            return res.err(token.value, `${this.getName()}: ${value} is below the minimum of ${this.range[0]}`);
        }

        return res;
    }

    public suggest(_input: TokenReader): string[] {
        return [];
    }
}

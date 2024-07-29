import {SemanticTokenType} from "../sem";
import {TokenReader, between} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";

export class MessageArgument implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const result = new ArgParseResult();
        result.token(between(input.current(), input.last()), SemanticTokenType.STRING);
        input.index = input.tokens.length;
        return result;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


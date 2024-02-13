import {SemanticTokenType} from "../sem";
import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, ensureEachCharMatches} from "./argument";

export class SwizzleArgument implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();
        const seen = new Set<string>();

        ensureEachCharMatches(arg, res, ch => {
            if ("xyz".indexOf(ch) == -1) {
                return `SwizzleArgument: unexpected character in swizzle: '${ch}' (must be x, y, or z)`;
            } else if (seen.has(ch)) {
                return `SwizzleArgument: duplicate character in swizzle: '${ch}'`;
            }
        });

        return res.token(arg.value, SemanticTokenType.SWIZZLE);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


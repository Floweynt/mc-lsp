import {SemanticTokenType} from "../sem";
import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";

export class OperatorArgument implements ArgumentParser {
    private static readonly KNOWN_OPERATORS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<", ">", "><"]); // >_< fr

    tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const tok = input.consume();
        res.token(tok.value, SemanticTokenType.OPERATOR);
        if (!OperatorArgument.KNOWN_OPERATORS.has(tok.value.str())) {
            res.err(tok.value, `OperatorArgument: unknown operator '${tok.value}'`);
        }

        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

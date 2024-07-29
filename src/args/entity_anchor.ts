import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, UnquotedStringParser} from "./argument";

export class EntityAnchorArgument extends UnquotedStringParser {
    private static readonly KNOWN_NAMES = new Set(["eyes", "feet"]);

    parseFinal(_input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        if (!EntityAnchorArgument.KNOWN_NAMES.has(arg.value.str())) {
            res.err(arg, `EntityAnchorArgument: unknown color '${arg.value.str()}'`);
        }

        res.token(arg, SemanticTokenType.ENUM);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, UnquotedStringParser} from "./argument";

export class ColorArgument extends UnquotedStringParser {
    private static normalizeString(str: string) {
        return str.toLowerCase().replace(/[^a-z]/g, "");
    }

    private static readonly KNOWN_NAMES = new Set(["black", "darkblue", "darkgreen", "darkaqua", "darkred", "darkpurple", "gold", "gray",
        "darkgray", "blue", "green", "aqua", "red", "lightpurple", "yellow", "white"]);

    parseFinal(_input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        const name = ColorArgument.normalizeString(arg.value.str());
        if (!ColorArgument.KNOWN_NAMES.has(name)) {
            res.err(arg, `ColorArgument: unknown color '${name}'`);
        }

        res.token(arg, SemanticTokenType.ENUM);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


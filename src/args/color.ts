import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, UnquotedStringParser} from "./argument";

export class ColorArgument extends UnquotedStringParser {
    private static normalizeString(str: string) {
        return str.toLowerCase().replace(/[^a-z]/, "");
    }

    private static readonly KNOWN_NAMES = new Set(["black", "dark_blue", "dark_green", "dark_aqua", "dark_red", "dark_purple", "gold", "gray",
        "dark_gray", "blue", "green", "aqua", "red", "light_purple", "yellow", "white"]);

    parseFinal(_input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        const name = ColorArgument.normalizeString(arg.value.str());
        if (!ColorArgument.KNOWN_NAMES.has(name)) {
            res.err(arg.value, `ColorArgument: unknown color '${name}'`);
        }

        res.token(arg.value, SemanticTokenType.COLOR);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


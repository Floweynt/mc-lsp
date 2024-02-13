import {parse} from "uuid";
import {SemanticTokenType} from "../sem";
import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";

export class EntityParser implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        if (arg.value.str().startsWith("@")) {
            if(arg.value.length() == 1) {
                return res.err(arg.value, "EntityParser: missing selector class (possible @p, @a, @r, @s, @e)");
            }
            
            const sel = arg.value.str().charAt(1);
            if("parse".indexOf(sel) == -1) {
                return res.err(arg.value, `EntityParser: unknown selector class '${sel}'`);
            }
        } else {
            try {
                parse(arg.value.str());
                res.token(arg.value, SemanticTokenType.UUID);
                return res;
            } catch (e) {
                res.token(arg.value, SemanticTokenType.PLAYER_NAME);
                if (arg.value.length() > 16) {
                    return res.err(arg.value, "EntityParser: player name too long (max 16 characters)");
                }

                if (!/\w+/.test(arg.value.str())) {
                    return res.err(arg.value, "EntityParser: bad player name (illegal character)");
                }

                return res;
            }
        }

        return res;
    }


    public suggest(input: TokenReader): string[] {
        return [];
    }
}



import {parse} from "uuid";
import {SemanticTokenType} from "../sem";
import {TokenReader, between} from "../tok";
import {ArgParseResult, ArgumentParser, PrefixedParseResultReporter} from "./argument";
import {parseProperties} from "./misc";
import {ENTITY_PREDICATE_PARSERS} from "./pred/entity";

export class EntityParser implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        if (arg.value.str().startsWith("@")) {
            if (arg.value.length() == 1) {
                return res.err(arg, "EntityParser: missing selector class (possible @p, @a, @r, @s, @e)");
            }

            const sel = arg.value.str().charAt(1);
            if ("parse".indexOf(sel) == -1) {
                return res.err(arg, `EntityParser: unknown selector class '${sel}'`);
            }

            // TODO: semantic token for @*
            if (arg.value.length() == 2) {
                return res;
            }

            const pred = arg.value.slice(2);

            if (!pred.str().startsWith("[")) {
                return res.err(pred, "EntityParser: illegal characters after entity selector class");
            }

            const props = parseProperties(pred, res, {
                allowEmptyKey: false,
                allowEmptyValue: true,
                keyRegex: /\w+/,
                valueRegex: /.*/,
                keyTokType: SemanticTokenType.PROPERTY,
                err: {
                    unclosed: "EntityParser: unclosed predicate block (missing ']')",
                    badKey: "EntityParser: illegal character in predicate key",
                    badValue: "<badValue you should not see this>",
                    emptyKey: "EntityParser: empty predicate key is not allowed",
                    emptyValue: "EntityParser: empty predicate valve is not allowed",
                    noEq: "EntityParser: missing '=' in predicate",
                    extraComma: "EntityParser: extra comma in property",
                },
            }, /^\[([^[]*)\](.*)$/);


            props?.forEach(([name, value]) => {
                const predParser = ENTITY_PREDICATE_PARSERS[name.str()];
                if (predParser == undefined) {
                    res.err(name, "EntityParser: unknown predicate");
                    return;
                }

                const instance = predParser.factory();

                if (!instance.allowEmpty && value.length() == 0) {
                    return res.err(between(name, value), "EntityParser: empty predicate value not allowed");
                }

                instance.parse(value, new PrefixedParseResultReporter(res, `EntityParser (predicate '${name.str()}'): `));
            });
        } else {
            try {
                parse(arg.value.str());
                res.token(arg, SemanticTokenType.UUID);
                return res;
            } catch (e) {
                res.token(arg, SemanticTokenType.PLAYER_NAME);
                if (arg.value.length() > 16) {
                    return res.err(arg, "EntityParser: player name too long (max 16 characters)");
                }

                if (!/\w+/.test(arg.value.str())) {
                    return res.err(arg, "EntityParser: bad player name (illegal character)");
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



import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, PrefixedParseResultReporter} from "./argument";
import {BlockStateLikeParser} from "./blockstate";
import {NDimensionalVectorArgument} from "./location";
import {parseGenericResource} from "./resource";

type ParticleHandler = (input: TokenReader, prevTok: CommandToken, res: ArgParseResult, config: Config) => void;

export class ParticleArgument implements ArgumentParser {

    private static readonly BLOCKSTATE_PARSER = new BlockStateLikeParser("ParticleArgument", false);
    private static readonly DUST_PARSER = new NDimensionalVectorArgument("ParticleArgument", 4, "", true);


    private static readonly SPECIAL_PARSE_REGISTRATION: [string[], ParticleHandler][] = [
        [["block", "block_marker", "falling_dust"], (input: TokenReader, prevTok: CommandToken, res: ArgParseResult, config: Config) => {
            if (input.current() === undefined) {
                return res.err(prevTok, "ParticleArgument: expected blockstate but got end of command");
            }

            res.merge(ParticleArgument.BLOCKSTATE_PARSER.tryParse(input, config));
        }],
        [["dust"], (input: TokenReader, prevTok: CommandToken, res: ArgParseResult) => {
            if (input.current() === undefined) {
                return res.err(prevTok, "ParticleArgument: expected float but got end of command");
            }

            return res.merge(this.DUST_PARSER.tryParse(input));
        }]
    ];

    private static readonly SPECIAL_PARSE_TABLE = (() => {
        const map = new Map<string, ParticleHandler>();
        ParticleArgument.SPECIAL_PARSE_REGISTRATION.map(ent => {
            ent[0].forEach(u => map.set(`minecraft:${u}`, ent[1]));
        });
        return map;
    })();

    tryParse(input: TokenReader, config: Config): ArgParseResult {
        const res = new ArgParseResult;
        const tok = input.consume();
        parseGenericResource(new PrefixedParseResultReporter(res, "ParticleArgument: "), false, tok.value, SemanticTokenType.RESOURCE);

        if (!res.success()) {
            return res;
        }

        let normalizedParticleId = "";
        const str = tok.value.str();
        if (str.indexOf(":") == -1) {
            normalizedParticleId = "minecraft:" + str;
        } else {
            normalizedParticleId = str;
        }

        if (config.getRegistry()["minecraft:particle_type"].indexOf(normalizedParticleId) == -1) {
            return res.warn(tok, "ParticleArgument: unknown particle type");
        }

        if (ParticleArgument.SPECIAL_PARSE_TABLE.has(normalizedParticleId)) {
            if (!(input.consume()?.isWhitespace ?? false)) {
                return res.err(tok, "ParticleArgument: expected additional arguments in particle");
            }

            ParticleArgument.SPECIAL_PARSE_TABLE.get(normalizedParticleId)!(input, tok, res, config);
        }

        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


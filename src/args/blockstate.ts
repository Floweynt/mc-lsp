import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, PrefixedParseResultReporter} from "./argument";
import {parseGenericResource} from "./resource";
import {parseProperties} from "./misc";

export class BlockStateLikeParser implements ArgumentParser {
    private readonly allowTag: boolean;
    private readonly name: string;

    public constructor(name: string, allowTag: boolean) {
        this.name = name;
        this.allowTag = allowTag;
    }

    public tryParse(input: TokenReader, config: Config): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        // regex based parsing 
        // very curse 
        const regexRes = arg.value.match(/(^[^[{]+)(.+)?$/);
        if (regexRes == null)
            return res.err(arg, `${this.name}: missing block id`);

        const blockId = regexRes[1] as RangeString;
        const state = regexRes[2];

        parseGenericResource(new PrefixedParseResultReporter(res, this.name + ": "), this.allowTag, blockId, SemanticTokenType.RESOURCE);
        let normalizedBlockId: string | null = null;

        if (res.errors.length == 0) {
            const str = blockId.str();
            if (str.indexOf(":") == -1) {
                normalizedBlockId = "minecraft:" + str;
            } else {
                normalizedBlockId = str;
            }

            const states = config.getBlockStates()[normalizedBlockId];
            // TODO: better tag processing
            if (states == undefined && !arg.value.str().startsWith("#")) {
                res.warn(blockId, `${this.name}: unknown block '${normalizedBlockId}'`);
                normalizedBlockId = null;
            }
        }

        // try and parse state...
        if (state != undefined && state.str().charAt(0) == "[") {
            const props = parseProperties(state, res, {
                keyRegex: /^\w*$/,
                valueRegex: /^\w*$/,
                allowEmptyKey: false,
                allowEmptyValue: false,
                keyTokType: SemanticTokenType.PROPERTY,
                err: {
                    unclosed: `${this.name}: unclosed block state property expression`,
                    badKey: `${this.name}: bad character in property key`,
                    badValue: `${this.name}: bad character in property value`,
                    emptyKey: `${this.name}: missing property key`,
                    emptyValue: `${this.name}: missing property value`,
                    noEq: `${this.name}: missing '=' in property`,
                    extraComma: `${this.name}: extra comma in property`,
                },
            });

            if (props && normalizedBlockId != null) {
                const seen = new Set<string>();
                props.forEach(([key, value]) => {
                    if (seen.has(key.str())) {
                        res.err(key, `${this.name}: duplicate property ${key.str()}`);
                    }
                    seen.add(key.str());

                    const allowedStates = config.getBlockStates()[normalizedBlockId as string][key.str()];
                    if (allowedStates == undefined) {
                        res.err(key, `${this.name}: unknown block state property '${key.str()}' in block '${normalizedBlockId}'`);
                        return;
                    }

                    if (allowedStates.indexOf(value.str()) == -1) {
                        res.err(
                            value,
                            `${this.name}: unknown block state value '${value.str()}' ` +
                            `in property '${key.str()}' ` +
                            `in block '${normalizedBlockId}'. ` +
                            `Note: allowed values are ${allowedStates.join(", ")}`
                        );
                    }

                    if (value.length()) {
                        res.token(value, /\d+/.test(value.str()) ? SemanticTokenType.NUMBER : SemanticTokenType.KEYWORD);
                    }
                });
            }
        }

        return res;
    }


    public suggest(input: TokenReader): string[] {
        return [];
    }
}

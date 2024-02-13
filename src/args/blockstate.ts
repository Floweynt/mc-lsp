import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";
import {parseGenericResource} from "./resource";
import {parseProperties} from "./utils";

export class BlockStateParser implements ArgumentParser {
    public tryParse(input: TokenReader, config: Config): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        // regex based parsing 
        // very cursed 
        const regexRes = arg.value.match(/(^[^[{]+)(.+)?$/);
        if (regexRes == null)
            return res.err(arg.value.range(), "BlockState: missing block id");

        const blockId = regexRes[1] as RangeString;
        const state = regexRes[2];

        parseGenericResource("BlockState", res, blockId, blockId.range(), SemanticTokenType.RESOURCE);
        let normalizedBlockId: string | null = null;

        if (res.errors.length == 0) {
            const str = blockId.str();
            if (str.indexOf(":") == -1) {
                normalizedBlockId = "minecraft:" + str;
            } else {
                normalizedBlockId = str;
            }

            const states = config.getBlockStates()[normalizedBlockId];
            if (states == undefined) {
                res.warn(blockId, `BlockState: unknown block '${normalizedBlockId}'`);
                normalizedBlockId = null;
            }
        }

        // try and parse state...
        if (state != undefined) {
            const props = parseProperties(state, res, {
                keyRegex: /\w*/,
                valueRegex: /\w*/,
                allowEmptyKey: false,
                allowEmptyValue: false,
                keyTokType: SemanticTokenType.BLOCK_STATE_PROPERTY_NAME,
                err: {
                    unclosed: "BlockState: unclosed block state property expression",
                    badKey: "BlockState: bad character in property key",
                    badValue: "BlockState: bad character in property value",
                    emptyKey: "BlockState: missing property key",
                    emptyValue: "BlockState: missing property value",
                    noEq: "BlockState: missing '=' in property",
                    extraComma: "BlockState: extra comma in property",
                },
            });

            if (props && normalizedBlockId != null) {
                props.forEach(entry => {
                    if (entry[0].length() == 0)
                        return;

                    const allowedStates = config.getBlockStates()[normalizedBlockId as string][entry[0].str()];
                    if (allowedStates == undefined) {
                        res.err(entry[0], `BlockState: unknown block state property '${entry[0].str()}' in block '${normalizedBlockId}'`);
                        return;
                    }

                    if (allowedStates.indexOf(entry[1].str()) == -1) {
                        res.err(
                            entry[1],
                            `BlockState: unknown block state value '${entry[1].str()}' ` +
                            `in property '${entry[0].str()}' ` +
                            `in block '${normalizedBlockId}'. ` +
                            `Note: allowed values are ${allowedStates.join(", ")}`
                        );
                    }

                    if (entry[1].length()) {
                        res.token(entry[1], /\d+/.test(entry[1].str()) ? SemanticTokenType.NUMBER : SemanticTokenType.LITERAL);
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


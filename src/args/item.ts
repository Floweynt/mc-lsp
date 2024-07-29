import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, PrefixedParseResultReporter} from "./argument";
import {parseGenericResource} from "./resource";
import {parseNbtTag} from "./nbt";

export class ItemLikeParser implements ArgumentParser {
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

        const itemId = regexRes[1] as RangeString;
        const nbt = regexRes[2];

        parseGenericResource(new PrefixedParseResultReporter(res, this.name + ": "), this.allowTag, itemId, SemanticTokenType.RESOURCE);

        // try and parse state...
        if (nbt !== undefined) {
            parseNbtTag(nbt, res);
        }

        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

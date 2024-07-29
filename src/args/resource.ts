import {SemanticTokenType} from "../sem";
import {RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, ParseResultReporter, PrefixedParseResultReporter} from "./argument";

export function parseGenericResource(
    res: ParseResultReporter,
    allowTag: boolean,
    text: RangeString,
    semanticTokenType: SemanticTokenType
) {
    if (allowTag && text.str().startsWith("#")) {
        res.token(text.charAt(0), semanticTokenType);
        text = text.slice(1);
    }

    const components = text.split(":");
    const range = text;
    if (components.length > 2) {
        return res.err(range, "extra namespace separators found, expected <id> or <ns>:<p>");
    }

    // occurs when :...
    if (components[0].str() == "") {
        return res.err(range, "missing namespace in resource");
    }

    const hasNs = components.length != 1;
    const namespace = hasNs ? components[0] : new RangeString("");
    const path = hasNs ? components[1] : components[0];

    if (path.str() == "") {
        return res.err(range, "missing path in resource");
    }

    if (!/^[a-z0-9._/-]+$/.test(path.str())) {
        return res.err(path, "resource path should match [a-z0-9._\\/-]+");
    }

    if (hasNs && !/^[a-z0-9._-]+$/.test(namespace.str())) {
        return res.err(namespace, "resource namespace should match [a-z0-9._-]+");
    }

    res.token(text, semanticTokenType);
    return res;
}

export class ResourceArgument implements ArgumentParser {
    private readonly name: string;
    private readonly allowTag: boolean;

    public constructor(name: string, allowTag: boolean) {
        this.name = name;
        this.allowTag = allowTag;
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        parseGenericResource(
            new PrefixedParseResultReporter(res, this.name + ": "),
            this.allowTag, 
            input.consume().value,
            SemanticTokenType.RESOURCE
        );
        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

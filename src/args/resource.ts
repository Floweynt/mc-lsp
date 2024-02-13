import {SemanticTokenType} from "../sem";
import {CommandRange, RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";

export function parseGenericResource(
    name: string,
    res: ArgParseResult,
    text: RangeString,
    semanticRange: CommandRange,
    semanticTokenType: SemanticTokenType
) {
    const components = text.split(':');
    const range = text;
    if (components.length > 2) {
        return res.err(range, `${name}: extra namespace separators found, expected <id> or <ns>:<p>`);
    }

    // occurs when :...
    if (components[0].str() == "") {
        return res.err(range, `${name}: missing namespace in resource`);
    }

    const hasNs = components.length != 1;
    const namespace = hasNs ? components[0] : new RangeString("");
    const path = hasNs ? components[1] : components[0];

    if (path.str() == "") {
        return res.err(range, `${name}: missing path in resource`);
    }

    if (!/^[a-z0-9._/-]+$/.test(path.str())) {
        return res.err(path, `${name}: resource path should match [a-z0-9._\\/-]+`);
    }

    if (hasNs && !/^[a-z0-9._-]+$/.test(namespace.str())) {
        return res.err(namespace, `${name}: resource namespace should match [a-z0-9._-]+`);
    }

    res.token(semanticRange, semanticTokenType);
    return res;
}

export class ResourceArgument implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const arg = input.consume();
        return parseGenericResource(
            "ResourceArgument",
            new ArgParseResult(),
            arg.value,
            arg.value.range(),
            SemanticTokenType.RESOURCE
        );
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ResourceOrTagArgument extends ResourceArgument {
    public tryParse(input: TokenReader): ArgParseResult {
        const arg = input.consume();

        if (arg.value.str().startsWith("#")) {
            if (arg.value.length() == 1) {
                return new ArgParseResult().err(arg.value, "ResourceOrTagArgument(tag): empty tag is not allowed");
            }

            return parseGenericResource(
                "ResourceOrTagArgument(tag)",
                new ArgParseResult(),
                arg.value.slice(1),
                arg.value.range(),
                SemanticTokenType.TAG
            );
        }

        return parseGenericResource(
            "ResourceOrTagArgument(resource)",
            new ArgParseResult(),
            arg.value,
            arg.value.range(),
            SemanticTokenType.RESOURCE
        );
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


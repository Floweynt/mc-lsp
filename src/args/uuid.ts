import {SemanticTokenType} from "../sem";
import {TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser} from "./argument";
import{parse} from "uuid";

export class UUIDArgument implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        try {
            parse(arg.value.str());
        } catch(e) {
            // uh oh, maybe the dashes are in bad locations...
            // TODO: handle this case, even though it's bad 
            return res.err(arg, "Invalid UUID, see https://datatracker.ietf.org/doc/html/rfc4122");
        }

        return res.token(arg, SemanticTokenType.UUID);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

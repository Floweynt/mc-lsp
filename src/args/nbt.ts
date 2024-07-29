import {SemanticTokenType} from "../sem";
import {RangeString, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, ParseResultReporter, PrefixedParseResultReporter} from "./argument";
import {StringReader} from "./misc";

class NbtReader extends StringReader {
    public constructor(str: RangeString, res: ParseResultReporter) {
        super(str, res);
    }

    private readKey() {
        const unquoted = this.readUnquoted();
        if (unquoted.length() == 0) {
            if (this.canRead()) {
                this.res.err(this.currRange(), "expected non-empty key but got illegal char");
                this.throwExpectedValue();
            } else {
                this.res.err(this.str, "expected key but got end of string");
                this.throwExpectedValue();
            }
        }
        this.res.token(unquoted, SemanticTokenType.PROPERTY);
    }

    private readValue() {
        this.skipWhitespace();
        if (this.curr() == "{") {
            return this.readTag();
        }
        if (this.curr() == "[") {
            return this.readList();
        }
        this.readTypedValue();
    }

    private hasElementSeparator() {
        this.skipWhitespace();
        if (this.canRead() && this.curr() == ",") {
            this.consume();
            this.skipWhitespace();
            return true;
        }

        return false;
    }

    public readTag() {
        if (!this.expect("{"))
            return;
        this.skipWhitespace();
        while (this.canRead() && this.curr() != "}") {
            this.readKey();
            this.skipWhitespace();
            if (!this.expect(":", SemanticTokenType.OPERATOR))
                this.stopParsing();
            this.readValue();
            if (!this.hasElementSeparator()) break;
            if (this.canRead()) continue;
            return this.throwExpectedValue();
        }

        if (!this.expect("}"))
            this.stopParsing();
    }

    public readTypedValue() {
        if (/["']/.test(this.curr())) {
            this.res.token(this.consumeString(), SemanticTokenType.STRING);
            return;
        }

        // TODO: actually parse
        const res = this.readUnquoted();

        if (res.length() == 0) {
            this.throwExpectedValue();
        }
    }

    public readList() {
        if (this.canRead(3) && !/['"]/.test(this.curr(1)) && this.curr(2) == ";") {
            return this.readArrayTag();
        }
        return this.readListTag();
    }

    public readArrayTag() {
        this.expect("[");
        this.consume();
        this.consume();
        while (this.curr() != "]") {
            this.readValue();
            if (!this.hasElementSeparator()) break;
            if (this.canRead()) continue;
            return this.throwExpectedValue();
        }

        if (!this.expect("]"))
            this.stopParsing();
    }

    public readListTag() {
        this.expect("[");
        this.skipWhitespace();
        if (!this.canRead()) {
            return this.throwExpectedValue();
        }

        while (this.curr() != "]") {
            // TODO: type checking            
            this.readValue();
            if (!this.hasElementSeparator()) break;
            if (this.canRead()) continue;

            return this.throwExpectedValue();
        }

        if(!this.expect("]")) 
            this.stopParsing();
    }
}

export function parseNbtTag(str: RangeString, res: ParseResultReporter) {
    try {
        new NbtReader(str, res).readTag();
    } catch (e) {
        if (e !== "__stop_parsing")
            throw e;
    }
}

export class CompoundTagArgument implements ArgumentParser {
    public tryParse(input: TokenReader): ArgParseResult {
        const instance = new ArgParseResult;
        parseNbtTag(input.consume().value, new PrefixedParseResultReporter(instance, "CompoundTagParser: "));
        return instance;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}


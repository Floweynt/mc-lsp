import {Diagnostic, DiagnosticSeverity} from "vscode-languageserver";
import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {CommandRange, CommandToken, RangeString, TokenReader, toLspRange} from "../tok";

export type ExampleEntry = [string, string] | string;

export interface ArgumentParser {
    readonly tryParse: (input: TokenReader, config: Config) => ArgParseResult;
    readonly suggest: (input: TokenReader) => string[];
    readonly examples?: () => ExampleEntry[];
}

export type CommandDiagnostic = [CommandRange, string];
export type CommandSemanticToken = [CommandRange, SemanticTokenType];

export interface SemanticTokenInfo {
    line: number;
    range: CommandRange;
    type: SemanticTokenType;
}

export class ArgParseResult {
    public readonly errors: CommandDiagnostic[];
    public readonly warnings: CommandDiagnostic[];
    public readonly semanticToken: CommandSemanticToken[];

    public errorsAsLsp(line: number): Diagnostic[] {
        return this.errors.map(diag => ({
            message: diag[1],
            range: toLspRange(line, diag[0]),
            severity: DiagnosticSeverity.Error,
        }));
    }

    public warningsAsLsp(line: number): Diagnostic[] {
        return this.warnings.map(diag => ({
            message: diag[1],
            range: toLspRange(line, diag[0]),
            severity: DiagnosticSeverity.Warning,
        }));
    }

    public tokensAsLsp(line: number): SemanticTokenInfo[] {
        return this.semanticToken.map(token => ({
            line: line,
            range: token[0],
            type: token[1],
        }));
    }

    public constructor() {
        this.errors = [];
        this.warnings = [];
        this.semanticToken = [];
    }

    public success() {
        return this.errors.length == 0;
    }

    public err(range: CommandRange | RangeString, msg: string) {
        this.errors.push([Array.isArray(range) ? range : range.range(), msg]);
        return this;
    }

    public warn(range: CommandRange | RangeString, msg: string) {
        this.warnings.push([Array.isArray(range) ? range : range.range(), msg]);
        return this;
    }

    public token(range: CommandRange | RangeString, token: SemanticTokenType) {
        this.semanticToken.push([Array.isArray(range) ? range : range.range(), token]);
        return this;
    }
}

export function takeWhile(s: RangeString, p: (ch: string) => boolean): [RangeString, RangeString] {
    let index = 0;
    while (p(s.str().charAt(index))) {
        index++;
    }

    return [
        s.slice(0, index),
        s.slice(index)
    ];
}

export function ensureEachCharMatches(
    arg: CommandToken,
    result: ArgParseResult,
    check: (ch: string) => string | undefined
) {
    for (let offset = 0; arg.value.length; offset++) {
        const ch = arg.value.charAt(offset);
        const checkRes = check(ch.str());
        if (checkRes) {
            result.err(ch.range(), checkRes);
        }
    }
}

export abstract class UnquotedStringParser implements ArgumentParser {
    public constructor() {

    }

    tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        const arg = input.consume();

        ensureEachCharMatches(arg, res, c => {
            if (!(c >= '0' && c <= '9' || c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c == '_' || c == '-' || c == '.' || c == '+'))
                return "Illegal character in unquoted string";
        });

        this.parseFinal(input, arg, res);
        return res;
    }

    abstract parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void;
    abstract suggest(input: TokenReader): string[];
}


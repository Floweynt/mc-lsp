import {Diagnostic, DiagnosticSeverity} from "vscode-languageserver";
import {Config} from "../config";
import {SemanticTokenType} from "../sem";
import {CommandRange, CommandToken, RangeString, TokenReader, getRange, toLspRange} from "../tok";

export type ExampleEntry = [string, string] | string;

export interface ArgumentParser {
    readonly tryParse: (input: TokenReader, config: Config) => ArgParseResult;
    readonly suggest: (input: TokenReader) => string[];
    readonly examples?: () => ExampleEntry[];
}

export type ArgumentDiagnostic = [CommandRange, string];
export type ArgumentSemanticToken = [CommandRange, SemanticTokenType];

export interface SemanticToken {
    line: number;
    range: CommandRange;
    type: SemanticTokenType;
}

export interface ParseResultReporter {
    err: (range: CommandRange | RangeString | CommandToken, msg: string) => void;
    warn: (range: CommandRange | RangeString | CommandToken, msg: string) => void;
    token: (range: CommandRange | RangeString | CommandToken, token: SemanticTokenType) => void;
}

export class PrefixedParseResultReporter implements ParseResultReporter {
    public readonly prefix: string;
    public readonly reporter: ParseResultReporter;

    public constructor(reporter: ParseResultReporter, prefix: string) {
        this.prefix = prefix;
        this.reporter = reporter;
    }

    err(range: CommandRange | RangeString | CommandToken, msg: string) {
        this.reporter.err(range, this.prefix + msg);
    }

    warn(range: CommandRange | RangeString | CommandToken, msg: string) {
        this.reporter.warn(range, this.prefix + msg);
    }

    token(range: CommandRange | RangeString | CommandToken, token: SemanticTokenType) {
        this.reporter.token(range, token);
    }
}

export class ArgParseResult implements ParseResultReporter {
    public readonly errors: ArgumentDiagnostic[];
    public readonly warnings: ArgumentDiagnostic[];
    private readonly semanticToken: ArgumentSemanticToken[];

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

    public tokensAsLsp(line: number): SemanticToken[] {
        return this.getSemanticTokens().map(token => ({
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

    public err(range: CommandRange | RangeString | CommandToken, msg: string) {
        this.errors.push([getRange(range), msg]);
        return this;
    }

    public warn(range: CommandRange | RangeString | CommandToken, msg: string) {
        this.warnings.push([getRange(range), msg]);
        return this;
    }

    public token(range: CommandRange | RangeString | CommandToken, token: SemanticTokenType) {
        this.semanticToken.push([getRange(range), token]);
        return this;
    }

    public getSemanticTokens() {
        return this.semanticToken.sort((a, b) => a[0][0] - b[0][0]);
    }

    public merge(rhs: ArgParseResult ) {
       this.errors.push(...rhs.errors);
       this.warnings.push(...rhs.warnings);
       this.semanticToken.push(...rhs.semanticToken);
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
    for (let offset = 0; offset < arg.value.length(); offset++) {
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
            if (!(c >= "0" && c <= "9" || c >= "A" && c <= "Z" || c >= "a" && c <= "z" || c == "_" || c == "-" || c == "." || c == "+"))
                return "Illegal character in unquoted string";
        });

        this.parseFinal(input, arg, res);
        return res;
    }

    abstract parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void;
    abstract suggest(input: TokenReader): string[];
}

export const UNQUOTED_STRING_REGEX = /^[0-9a-zA-Z_.+-]+$/;

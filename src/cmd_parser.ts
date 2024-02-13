import {CompletionItem, CompletionItemKind, Diagnostic, DiagnosticSeverity} from "vscode-languageserver";
import {CommandRange, CommandToken, TokenReader, between, toLspRange, tokenize} from "./tok";
import {SemanticTokenType} from "./sem";
import {ArgParseResult, SemanticTokenInfo} from "./args/argument";
import {getParser} from "./args/parsers";
import {Config, MCCommand, RootCommand} from "./config";

export interface CommandReporter {
    readonly diagnostics: Diagnostic[];
    readonly tokens: SemanticTokenInfo[];
}

export interface CommandSemanticInfo {
    path: {
        isLiteral: boolean;
        node: MCCommand;
        range: CommandRange;
        parseData?: any;
    }[];
    isPathFull: boolean;
    tokens: CommandToken[];
    doAutocomplete: (ch: number) => CompletionItem[];
}

export function parse(line: number, text: string, root: RootCommand, report: CommandReporter, config: Config): CommandSemanticInfo {
    const tokReader = new TokenReader(tokenize(text), text);
    const parseResult: CommandSemanticInfo = {
        path: [],
        tokens: [],
        isPathFull: false,
        doAutocomplete: (ch) => doAutocomplete(config, parseResult, ch) ?? [],
    };

    let currNode: MCCommand = root;

    if (tokReader.current().isWhitespace) {
        report.diagnostics.push({
            range: toLspRange(line, tokReader.current().value),
            message: "Unexpected whitespace before command",
            severity: DiagnosticSeverity.Error,
        });
        tokReader.consume();
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const startingLocation = tokReader.index;

        if (tokReader.current() == undefined) {
            parseResult.isPathFull = true;
            if (currNode.executable) {
                return parseResult;
            }

            if (tokReader.current() == undefined) {
                report.diagnostics.push({
                    range: toLspRange(line, tokReader.range()),
                    message: "Incomplete command",
                    severity: DiagnosticSeverity.Error,
                });
                return parseResult;
            }
        }

        const argResults: ArgParseResult[] = [];
        let success = false;

        for (const name in currNode.children) {
            const child = (currNode.children ?? {})[name] as MCCommand;

            if (child.type == "literal") {
                if (name == tokReader.current().value.str()) {
                    report.tokens.push({
                        line: line,
                        range: tokReader.current().value.range(),
                        type: SemanticTokenType.LITERAL,
                    });

                    parseResult.path.push({
                        isLiteral: true,
                        node: child,
                        range: tokReader.current().value.range(),
                    });

                    currNode = child;
                    success = true;
                    tokReader.next();
                    break;
                }
            } else if (child.type == "argument") {
                const parser = getParser(child.parser);

                // parse argument
                const result = parser.factory(child.properties ?? {}).tryParse(tokReader, config);

                // if we are successful...
                if (result.errors.length == 0) {
                    // report diagnostics and tokens 
                    report.tokens.push(...result.tokensAsLsp(line));
                    report.diagnostics.push(...result.warningsAsLsp(line));

                    // report this argument
                    parseResult.path.push({
                        isLiteral: true,
                        node: child,
                        range: between(tokReader.at(startingLocation), tokReader.previous()),
                    });

                    currNode = child;
                    success = true;
                    break;
                }

                tokReader.index = startingLocation;
                argResults.push(result);
            }
        }

        // we failed  to parse, try and recover from this
        if (!success) {
            // only one argument
            // TODO: provide better diagnostics when literals are present
            if (argResults.length == 1) {
                const result = argResults[0];
                // report diagnostics and give up 
                report.diagnostics.push(...result.errorsAsLsp(line));
                report.diagnostics.push(...result.warningsAsLsp(line));
                report.tokens.push(...result.tokensAsLsp(line));
                return parseResult;
            } else if (argResults.length == 0) {
                const prevTok = tokReader.tokens[startingLocation];

                report.diagnostics.push({
                    message: `Expected literal but got unknown literal '${prevTok.value.str()}'`,
                    range: toLspRange(line, prevTok.value),
                });

                report.tokens.push({
                    line: line,
                    range: prevTok.value.range(),
                    type: SemanticTokenType.LITERAL,
                });

                return parseResult;

            } else {
                report.diagnostics.push({
                    range: toLspRange(line, tokReader.current().value),
                    message: "I don't want to handle this case, if you see this tell me and I'll cry",
                });
                return parseResult;
            }
        }

        if (tokReader.current()) {
            if (!tokReader.current().isWhitespace) {
                throw Error("illegal tokenizer state");
            }

            if (tokReader.current().value.str() != " ") {
                report.diagnostics.push({
                    range: toLspRange(line, tokReader.current().value),
                    message: "Extra space in command",
                });
            }

            tokReader.next();
        }
    }
}

export function doAutocomplete(config: Config, info: CommandSemanticInfo | undefined, ch: number) {
    const suggestOnEmpty = (node: MCCommand) => {
        const sug: CompletionItem[] = [];
        for (const child in node.children ?? {}) {
            const childNode = (node.children ?? {})[child]!;
            if (childNode.type == "literal") {
                sug.push({
                    label: child,
                    kind: CompletionItemKind.Function,
                });
            } else if (childNode.type == "argument") {
                const parser = getParser(childNode.parser);

                const defaultExamples: CompletionItem[] = // 
                    (parser.sample ?? parser.factory(childNode.properties ?? {})?.examples!() ?? []).map(u => {
                        const value = Array.isArray(u) ? u[0] : u;
                        const tag = Array.isArray(u) ? `${childNode.parser} (${u[1]})` : childNode.parser;

                        return {
                            label: value,
                            kind: CompletionItemKind.Constant,
                            labelDetails: {
                                description: tag,
                            },
                        };
                    });

                sug.push(...defaultExamples);
            }
        }

        // TODO: better suggesting
        return sug;
    };

    if (!info) {
        return suggestOnEmpty(config.getCommand());
    }

    console.log(info.isPathFull, info.path[info.path.length - 1]);
    if (info.isPathFull && ch > info.path[info.path.length - 1].range[1]) {
        return suggestOnEmpty(info.path[info.path.length - 1].node);
    }
}

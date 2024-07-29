// cSpell:ignore nonterminal
import {CompletionItem, CompletionItemKind, Diagnostic} from "vscode-languageserver";
import {CommandRange, CommandToken, TokenReader, between, getRange, toLspRange, tokenize} from "./tok";
import {SemanticTokenType} from "./sem";
import {SemanticToken} from "./args/argument";
import {getParser} from "./args/parsers";
import {Config, CommandNode, CommandRootNode} from "./config";
import {requireHasValue} from "./utils";
import assert from "assert";

export interface CommandSemanticInfoPathEntry {
    isLiteral: boolean;
    node: CommandNode;
    range: CommandRange;
    parseData?: unknown;
}

export type CommandSemanticInfo = {
    readonly diagnostics: Diagnostic[];
    readonly tokens: SemanticToken[];
} & ({
    readonly isAmbiguous: false;
    readonly path: readonly CommandSemanticInfoPathEntry[];
    readonly doAutocomplete: (ch: number) => CompletionItem[];
} | {
    readonly isAmbiguous: true;
    readonly path: readonly CommandSemanticInfoPathEntry[][];
    readonly doAutocomplete: (ch: number) => CompletionItem[];
})

export interface ParseResultNode {
    readonly parent?: ParseResultNode;
    readonly diagnostics: Diagnostic[];
    readonly tokens: SemanticToken[];
    readonly isLiteral: boolean;
    readonly node: CommandNode;
    readonly range: CommandRange;
    readonly parseData?: unknown;
    readonly tokReader: TokenReader;
    readonly isArgParseSuccess: boolean;
    readonly isRoot: boolean;
}

function resolveCommandByPath(root: CommandRootNode, path: string[]) {
    return path.reduce<CommandNode>((node, name) => requireHasValue((node.children ?? {})[name]), root);
}

function nodeToList(node: ParseResultNode): readonly ParseResultNode[] {
    const parseResultList: ParseResultNode[] = [];

    while (node.parent !== undefined) {
        parseResultList.push(node);
        node = node.parent;
    }

    // The last node is always the root, which isn't a real node and should be ignored.
    return parseResultList.reverse();
}

function generateUnambiguousReport(node: ParseResultNode): CommandSemanticInfo {
    const path = nodeToList(node);
    return {
        diagnostics: path.flatMap(entry => entry.diagnostics),
        tokens: path.flatMap(entry => entry.tokens),
        isAmbiguous: false,
        path: path,
        doAutocomplete: () => [],
    };
}

function effectiveChildNodes(root: CommandRootNode, cmd: CommandNode) {
    const res = Object.entries(cmd.children ?? {});

    if (cmd.redirect) {
        res.push(...Object.entries(resolveCommandByPath(root, cmd.redirect).children ?? {}));
    }

    return res;
}

class CommandParser {
    private readonly tokens: CommandToken[];
    private readonly text: string;
    private readonly line: number;
    private readonly root: CommandRootNode;
    private readonly config: Config;

    public constructor(line: number, text: string, trimmed: string, root: CommandRootNode, config: Config) {
        //if (/^run|loop.+{$/.test(trimmed)) {
        //      text = text.substring(0, text.length - 1).trimEnd();
        //}

        // TODO: leading spaces aren't technically allowed, generate diagnostic if leading space count != expect due to run/loop blocks
        this.tokens = tokenize(text);
        this.text = text;

        if (this.tokens[0].isWhitespace) {
            this.tokens = this.tokens.slice(1);
        }

        this.line = line;
        this.root = root;
        this.config = config;
    }

    private parseChildren(curr: ParseResultNode): ParseResultNode[] {
        const tokReader = curr.tokReader;

        return effectiveChildNodes(this.root, curr.node).map(([name, child]) => {
            const range = getRange(tokReader.current());

            if (child.type === "literal") {
                return {
                    parent: curr,
                    diagnostics: [],
                    tokens: [{
                        line: this.line,
                        range: range,
                        type: SemanticTokenType.COMMAND_LITERAL,
                    }],
                    isLiteral: true,
                    node: child,
                    range: range,
                    tokReader: tokReader.fork().next(),
                    isArgParseSuccess: name === curr.tokReader.current().value.str(),
                    isRoot: false,
                };
            } else if (child.type === "argument") {
                const parser = getParser(child.parser);
                const tokReaderFork = tokReader.fork();

                // parse argument
                const result = parser.factory(child.properties ?? {}).tryParse(tokReaderFork, this.config);

                // report and move on
                return {
                    parent: curr,
                    diagnostics: [...result.errorsAsLsp(this.line), ...result.warningsAsLsp(this.line)],
                    tokens: [...result.tokensAsLsp(this.line)],
                    isLiteral: false,
                    node: child,
                    range: between(tokReader.current(), tokReaderFork.previous()),
                    tokReader: tokReaderFork,
                    isArgParseSuccess: result.errors.length === 0,
                    isRoot: false,
                };
            }

            throw Error("illegal state");
        });
    }

    // The logic here is terrible and difficult to understand.
    // I try my best to document how things work
    public doParse(): CommandSemanticInfo | undefined {
        let currResults: ParseResultNode[] = [{
            diagnostics: [],
            tokens: [],
            isLiteral: false,
            node: this.root,
            range: [0, 0],
            tokReader: new TokenReader(this.tokens, this.text),
            isArgParseSuccess: true,
            isRoot: true,
        }];

        const successfulNodes: ParseResultNode[] = [];

        // This main loop is basically a BFS
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Handle end of command, removing entries that cannot be read any further
            // TODO: generate smarter diagnostics for garbage after end of line
            const nonterminalResults = currResults.filter(result => {
                // Only handle end of command
                if (result.tokReader.current() !== undefined) {
                    return true;
                }

                if (result.node.executable) {
                    successfulNodes.push(result);
                } else {
                    // Command ended, but not executable - add this to the list of errors associated with the node 
                    result.diagnostics.push({
                        range: toLspRange(this.line, [0, this.text.length]),
                        message: "Incomplete command",
                    });
                }

                // Remove entries that have ended
                return false;
            });

            // Special error processing case: every possible parsing option ended with end-of-line
            // Report the command as incomplete, and process errors.
            if (nonterminalResults.length === 0) {
                if (successfulNodes.length !== 0) {
                    break;
                }

                if (currResults.length === 1) {
                    return generateUnambiguousReport(currResults[0]);
                } else {
                    // Ambiguous case, this sucks.
                    throw new Error("Ambiguous parse result reporting is not implemented");
                }
            }

            // Handle the next argument for each entry
            const newResults = nonterminalResults.flatMap(e => this.parseChildren(e));
            const validResults = newResults.filter(e => e.isArgParseSuccess);

            // We have exhausted all children while parsing. 
            // This is an error condition: we want to emit diagnostics for what we believe the error is.
            if (validResults.length === 0) {
                // We have successfully parsed at least one node previously, so it's ok that we ended up terminating.
                // Break to process results.
                if (successfulNodes.length !== 0) {
                    break;
                }

                // Here is the "annoying" case: we have *completely* failed to parse
                // Here, we must try our best to accurately identify the source of the problem, and generate a 
                // correct diagnostic for the developer.
                assert(newResults.length !== 0);
                if (newResults.length === 1) {
                    return generateUnambiguousReport(newResults[0]);
                } else {
                    throw new Error("Ambiguous parse result reporting is not implemented");
                }
            }

            currResults = validResults;

            // Consume whitespaces, generating errors if reasonable
            for (const result of currResults) {
                if (result.tokReader.current() === undefined)
                    continue;

                if (!result.tokReader.current().isWhitespace) {
                    throw Error("illegal tokenizer state");
                }

                if (result.tokReader.current().value.str() !== " ") {
                    result.diagnostics.push({
                        range: toLspRange(this.line, result.tokReader.current()),
                        message: "Extra space in command",
                    });
                }

                result.tokReader.next();
            }
        }

        assert(successfulNodes.length !== 0);

        if (successfulNodes.length !== 1) {
            console.warn("not fully implemented here");
            return generateUnambiguousReport(successfulNodes[0]);
        }

        return generateUnambiguousReport(successfulNodes[0]);
    }
}

export function parseCmd(line: number, text: string, root: CommandRootNode, config: Config): CommandSemanticInfo | undefined {
    const trimmed = text.trim();
    if (trimmed === "}") {
        return;
    }

    const instance = new CommandParser(line, text, trimmed, root, config);
    return instance.doParse();
}

export function doAutocomplete(config: Config, info: CommandSemanticInfo | undefined, ch: number) {
    const suggestOnEmpty = (node: CommandNode) => {
        const sug: CompletionItem[] = [];
        for (const child in node.children ?? {}) {
            const childNode = (node.children ?? {})[child]!;
            if (childNode.type === "literal") {
                sug.push({
                    label: child,
                    kind: CompletionItemKind.Function,
                });
            } else if (childNode.type === "argument") {
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

    /* if (info.isPathFull && ch > info.path[info.path.length - 1].range[1]) {
         return suggestOnEmpty(info.path[info.path.length - 1].node);
     }*/
}

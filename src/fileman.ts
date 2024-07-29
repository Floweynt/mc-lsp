import {Diagnostic, TextDocumentPositionParams} from "vscode-languageserver";
import {CommandSemanticInfo, parseCmd, doAutocomplete} from "./cmd_parser";
import {Config} from "./config";
import {SemanticTokenType} from "./sem";
import {SemanticToken} from "./args/argument";

export interface FileInfo {
    semanticToken: number[];
    diagnostics: Diagnostic[];
    parseCache: Map<number, CommandSemanticInfo>;
}

export class FileManager {
    private cache: Map<string, FileInfo>;
    public readonly config: Config;

    public constructor(config: Config) {
        this.cache = new Map();
        this.config = config;
    }

    public clear() {
        this.cache.clear();
    }

    public updateFile(uri: string, content: string) {
        const lines = content.split("\n");

        const tokens: SemanticToken[] = [];
        const diagnostics: Diagnostic[] = [];

        const parseCache = new Map<number, CommandSemanticInfo>();

        lines.forEach((lineText, lineNo) => {
            if (lineText.length == 0)
                return;

            if (lineText.trimStart().startsWith("#")) {
                tokens.push({
                    line: lineNo,
                    range: [0, lineText.length],
                    type: SemanticTokenType.COMMENT,
                });

                return;
            }

            const parseRes = parseCmd(lineNo, lineText, this.config.getCommand(), this.config);
            if (parseRes == undefined) {
                return;
            }
            parseCache.set(lineNo, parseRes);
            tokens.push(...parseRes.tokens);
            diagnostics.push(...parseRes.diagnostics);

        });

        let prev = {
            line: 0,
            range: [0, 0],
        };

        const semRes = new Array<number>(5 * tokens.length);

        tokens.forEach((value, index) => {
            const lineDiff = semRes[index * 5] = value.line - prev.line;
            semRes[index * 5 + 1] = (lineDiff == 0) ? value.range[0] - prev.range[0] : value.range[0];
            semRes[index * 5 + 2] = value.range[1] - value.range[0];
            semRes[index * 5 + 3] = value.type;
            semRes[index * 5 + 4] = 0;

            prev = value;
        });

        this.cache.set(uri, {
            diagnostics: diagnostics,
            semanticToken: semRes,
            parseCache: parseCache,
        });
    }

    public getInfo(uri: string) {
        return this.cache.get(uri);
    }

    public doAutocomplete(location: TextDocumentPositionParams) {
        const info = this.getInfo(location.textDocument.uri);
        if (info?.parseCache.has(location.position.line)) {
            return info.parseCache.get(location.position.line)!.doAutocomplete(location.position.character)!;
        }

        return doAutocomplete(this.config, undefined, location.position.line);
    }
}

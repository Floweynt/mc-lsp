import {lstatSync, readFileSync, readdirSync} from "fs";
import {FileInfo, FileManager} from "../src/fileman";
import {Config} from "../src/config";
import {COLORS, DEFAULT_FMT, FMT_ERR, FMT_WARN, StringFormatter} from "./formatter";
import {DiagnosticSeverity, Position} from "vscode-languageserver";
import {SEMANTIC_TOKEN_NAMES} from "../src/sem";
import {inspect} from "util";

if (process.argv.length <= 2) {
    console.error("please specify directory");
    process.exit(-1);
}

const config = new Config();
config.load(".");
const files = new FileManager(config);

function runHighlights(text: string, info: FileInfo) {
    const lines = [0];
    let currIndex = 0;
    let val = 0;

    while ((val = text.indexOf("\n", currIndex)) != -1) {
        if (val == -1)
            continue;
        currIndex = val + 1;
        lines.push(currIndex);
    }

    const indexGetter = (location: Position) => {
        return lines[location.line] + location.character;
    };

    const fullFmt = new StringFormatter(text, DEFAULT_FMT);

    info.diagnostics.forEach(diagnostic => {
        const highlight = [DEFAULT_FMT, FMT_ERR, FMT_WARN, FMT_WARN, DEFAULT_FMT][diagnostic.severity ?? DiagnosticSeverity.Error];
        fullFmt.set(indexGetter(diagnostic.range.start), indexGetter(diagnostic.range.end), highlight);
    });

    let currLine = 0;
    let currChar = 0;

    for (let i = 0; i < info.semanticToken.length / 5; i++) {
        const [deltaLine, deltaChar, length, type] = info.semanticToken.slice(i * 5, i * 5 + 5);
        if (deltaLine != 0) {
            currChar = 0;
        }

        currLine += deltaLine;
        currChar += deltaChar;

        const startByte = lines[currLine] + currChar;
        fullFmt.set(startByte, startByte + length, {
            fg: COLORS[SEMANTIC_TOKEN_NAMES[type]],
        });
    }

    return fullFmt.toString();
}

let total = 0;
let parsedWithDiagnostics = 0;
let crashed = 0;

const dir = process.argv[2];

(readdirSync(dir, {recursive: true, withFileTypes: false, }) as string[]).forEach(file => {
    file = `${dir}/${file}`;
    if (lstatSync(file).isFile() && file.endsWith(".mcfunction")) {
        total++;
        const content = readFileSync(file).toString();
        try {
            files.updateFile(file, content);
            console.log(`highlight: ${file}`);
            const info = files.getInfo(file)!;
            if (info.diagnostics.length > 0) {
                parsedWithDiagnostics++;
                console.error(`file has syntax errors: ${file}`, info.diagnostics);
            }

            console.log(runHighlights(content, info));
        } catch (e) {
            console.error(`failed to process file ${file}`, e);
            crashed++;
        }
    }
});

console.error(`Total/Diagnostic/Crash/Success: ${total}/${parsedWithDiagnostics}/${crashed}/${total - parsedWithDiagnostics - crashed}`);

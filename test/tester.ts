import chalk from "chalk";
import {getParser} from "../src/args/parsers";
import {Config} from "../src/config";
import {SEMANTIC_TOKEN_NAMES, SemanticTokenType} from "../src/sem";
import {TokenReader, tokenize} from "../src/tok";
import {stdout} from "process";
import {inspect} from "util";
import {COLORS, DEFAULT_FMT, FMT_ERR, FMT_WARN, StringFormatter} from "./formatter";

// argument tests 
export interface ArgumentTestCase {
    name: string;
    value: string;
    errors: [number, number, string][];
    warnings: [number, number, string][];
    token: string;
    many?: boolean;
}

export interface ArgumentTest {
    name: string;
    argType: string;
    params?: object;
    cases: ArgumentTestCase[];
}

function exportFormatting(
    value: string,
    err: [number, number, string][],
    warn: [number, number, string][],
    token: [number, number, number][]
) {
    let res: string = "";
    const fmt = new StringFormatter(value, DEFAULT_FMT);

    token.forEach(([start, end, value]) => {
        fmt.set(start, end, {
            fg: COLORS[SEMANTIC_TOKEN_NAMES[value]],
        });
    });

    const fullFmt = fmt.clone();

    err.forEach(([start, end]) => {
        fullFmt.set(start, end, FMT_ERR);
    });

    warn.forEach(([start, end]) => {
        fullFmt.set(start, end, FMT_WARN);
    });

    res += fullFmt.toString();

    if (err.length + warn.length == 1) {
        res = `${res} (${chalk.italic((err[0] ?? warn[0])[2])})\n`;
    }
    else {
        res += "\n";
        err.forEach(([start, end, message]) => {
            res += `- ${fmt.clone().set(start, end, FMT_ERR)}: ${message}\n`;
        });

        warn.forEach(([start, end, message]) => {
            res += `- ${fmt.clone().set(start, end, FMT_WARN)}: ${message}\n`;
        });
    }

    return res;
}

export function run(tests: ArgumentTest[]) {
    const cfg = new Config();
    tests.forEach(test => {
        console.log(chalk.bold(`Running test ${test.name}`) + ":");
        const parser = getParser(test.argType);
        const instance = parser.factory(test.params ?? {});
        let fail = false;
        let res: string = "";
        test.cases.forEach(testCase => {
            stdout.write(chalk.italic(`Running case ${testCase.name}... `));

            const reader = new TokenReader(tokenize(testCase.value), testCase.value);
            const err: [number, number, string][] = [];
            const warn: [number, number, string][] = [];
            const token: [number, number, number][] = [];

            do {
                const result = instance.tryParse(reader, cfg);
                err.push(...result.errors.map(e => [e[0][0], e[0][1], e[1]] as [number, number, string]));
                warn.push(...result.warnings.map(e => [e[0][0], e[0][1], e[1]] as [number, number, string]));
                token.push(...result.getSemanticTokens().map(e => [e[0][0], e[0][1], e[1]] as [number, number, number]));
                reader.consume();
            } while (testCase.many && reader.current());
            const expectedToken = makeTokens(testCase.token);
            const isSuccess =
                JSON.stringify(err) == JSON.stringify(testCase.errors) &&
                JSON.stringify(warn) == JSON.stringify(testCase.warnings) &&
                JSON.stringify(token) == JSON.stringify(expectedToken);

            stdout.write(isSuccess ? chalk.green("OK") : chalk.red("FAILED"));
            stdout.write("\n");

            if (!isSuccess) {
                console.log("errors:" + inspect(err) + ",");
                console.log("warnings:" + inspect(warn) + ",");
                console.log(
                    "tokens: " + inspect(token.map(([a, b, c]) => [a, b, "SemanticTokenType." + SemanticTokenType[c]])).replace(/'/g, ""));
                console.log(
                    "tokens: " + inspect(expectedToken.map(([a, b, c]) => [a, b, "SemanticTokenType." + SemanticTokenType[c]])).replace(/'/g, ""));


            }

            res += exportFormatting(testCase.value, err, warn, token);

            fail = fail || !isSuccess;
        });

        console.log(chalk.bold("Highlight example: \n" + res));

        console.log(`Test ${test.name}: ${fail ? chalk.red("FAILED") : chalk.green("OK")}`);
    });
}

const TOKEN_RANGE_LOOKUP: {[key: string]: number} = {
    " ": -1,
    "~": SemanticTokenType.POS_REL,
    "0": SemanticTokenType.NUMBER,
    "s": SemanticTokenType.STRING,
    "r": SemanticTokenType.RESOURCE,
    "-": SemanticTokenType.UUID,
    ".": SemanticTokenType.SWIZZLE,
    "=": SemanticTokenType.OPERATOR,
    "p": SemanticTokenType.PROPERTY,

    "P": SemanticTokenType.PLAYER_NAME,
    "U": SemanticTokenType.UNITS,
    "S": SemanticTokenType.SCOREBOARD_ID,
    "O": SemanticTokenType.PROPERTY,
    "C": SemanticTokenType.ENUM,
    "I": SemanticTokenType.SLOT,
};

export function makeTokens(val: string) {
    let previous = val.charAt(0);
    let prevStart = 0;
    const res: [number, number, number][] = [];

    for (let i = 0; i < val.length; i++) {
        if (previous != val.charAt(i)) {
            res.push([prevStart, i, TOKEN_RANGE_LOOKUP[previous]]);
            previous = val.charAt(i);
            prevStart = i;
        }
    }

    res.push([prevStart, val.length, TOKEN_RANGE_LOOKUP[previous]]);

    return res.filter(x => x[2] != -1);
}

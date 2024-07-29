import {Range} from "vscode-languageserver";

export type CommandRange = [number, number]

export function sliceRange(range: CommandToken | RangeString | CommandRange, start: number, end?: number): CommandRange {
    const actualRange = getRange(range);
    return [actualRange[0] + start, end == undefined ? actualRange[1] : actualRange[0] + end];
}

export function sliceLenRange(range: CommandToken | RangeString | CommandRange, start: number, length?: number): CommandRange {
    const actualRange = getRange(range);
    return [actualRange[0] + start, length == undefined ? actualRange[1] : actualRange[0] + start + length];
}

export function toLspRange(line: number, range: CommandToken | RangeString | CommandRange) {
    const actualRange = getRange(range);
    return Range.create(line, actualRange[0], line, actualRange[1]);
}

export interface CommandToken {
    value: RangeString;
    isWhitespace: boolean;
}

export function getRange(range: CommandToken | RangeString | CommandRange) {
    if (Array.isArray(range)) {
        return range;
    } else if (range instanceof RangeString) {
        return range.range();
    }
    return range.value.range();
}

export function between(...arg: (CommandToken | RangeString | CommandRange)[]): CommandRange {
    return [
        getRange(arg[0])[0],
        getRange(arg[arg.length - 1])[1]
    ];
}

class CommandTokenizer {
    private str: string;
    private index: number;
    private delimiter?: string;

    public constructor(str: string, delimiter?: string) {
        this.str = str;
        this.index = 0;
        this.delimiter = delimiter;
    }

    private consumeString() {
        const ch = this.str.charAt(this.index);
        let isEscaped = false;
        do {
            if (isEscaped) {
                this.index++;
                isEscaped = false;
            } else {
                if (this.ch() == "\\")
                    isEscaped = true;
            }

            this.index++;
        } while (this.ch() != ch && this.index < this.str.length);
    }

    private ch() {
        return this.str.charAt(this.index);
    }

    private doReadString(delimiter: string) {
        const start = this.index;

        const chStack: string[] = [];
        while (this.ch() != delimiter || chStack.length != 0) {
            if (this.index >= this.str.length)
                break;

            if ("\"'".indexOf(this.ch()) != -1) {
                this.consumeString();
            } else {
                if ("[{".indexOf(this.ch()) != -1) {
                    chStack.push(this.ch());
                } else if ("]}".indexOf(this.ch()) != -1) {
                    while (chStack.length != 0) {
                        const top = chStack.pop();
                        if (
                            (top == "{" && this.ch() == "}") ||
                            (top == "[" && this.ch() == "]"))
                            break;
                    }
                }
            }
            this.index++;
        }

        return {
            value: new RangeString(this.str.slice(start, this.index), [start, this.index]),
            isWhitespace: false,
        };
    }

    private parseText(): CommandToken {
        const start = this.index;
        if (this.delimiter == undefined) {
            if (/\s/.test(this.ch())) {
                while (/\s/.test(this.ch())) {
                    this.index++;
                }

                return {
                    value: new RangeString(this.str.slice(start, this.index), [start, this.index]),
                    isWhitespace: true,
                };
            } else {
                return this.doReadString(" ");
            }
        } else {
            const val = this.doReadString(this.delimiter);
            this.index++;
            return val;
        }
    }

    public tokenize(): CommandToken[] {
        const ret: CommandToken[] = [];
        while (this.index < this.str.length) {
            ret.push(this.parseText());
        }

        return ret;
    }
}

export function tokenize(str: string): CommandToken[] {
    return new CommandTokenizer(str).tokenize();
}

export function splitByCh(str: RangeString, delimiter: string): RangeString[] {
    const tokens = new CommandTokenizer(str.str(), delimiter).tokenize().map(tok => {
        const realStart = str.start() + tok.value.start();
        return new RangeString(tok.value.str(), [realStart, realStart + tok.value.length()]);
    });
    return tokens;
}

export class TokenReader {
    public tokens: CommandToken[];
    public index: number;
    public text: string;

    public constructor(tokens: CommandToken[], text: string, index: number = 0) {
        this.tokens = tokens;
        this.index = index;
        this.text = text;
    }

    public current() {
        return this.tokens[this.index];
    }

    public previous() {
        return this.tokens[this.index - 1];
    }

    public range() {
        return between(this.tokens[0], this.last());
    }

    public next() {
        this.index++;
        return this;
    }

    public consume() {
        return this.tokens[this.index++];
    }

    public last() {
        return this.tokens[this.tokens.length - 1];
    }

    public at(index: number) {
        return this.tokens[index];
    }

    public fork() {
        return new TokenReader(this.tokens, this.text, this.index);
    }
}

export class RangeString {
    private value: string;
    private _range: CommandRange;

    constructor(value: string, range?: CommandRange) {
        this.value = value;
        this._range = range ?? [0, value.length];
    }

    str(): string {
        return this.value;
    }

    range(): CommandRange {
        return this._range;
    }

    start() {
        return this._range[0];
    }

    end() {
        return this._range[1];
    }

    length(): number {
        return this.value.length;
    }

    slice(start: number, end?: number): RangeString {
        if (end === undefined) {
            end = this.value.length;
        }

        const newRange: CommandRange = [this._range[0] + start, this._range[0] + end];
        const newValue: string = this.value.slice(start, end);
        return new RangeString(newValue, newRange);
    }

    split(separator: string, limit?: number): RangeString[] {
        let substrings = this.value.split(separator);
        if (limit != undefined && substrings.length > limit) {
            substrings = substrings.slice(0, limit - 1).concat(substrings.slice(limit - 1).join(separator));
        }

        let currentIndex = this._range[0];
        return substrings.map(substring => {
            const substringRange: CommandRange = [currentIndex, currentIndex + substring.length];
            currentIndex += substring.length + separator.length;
            return new RangeString(substring, substringRange);
        });
    }

    charAt(offset: number) {
        const str = this.value.charAt(offset);
        const start = this._range[0] + offset;
        return new RangeString(str, [start, start + str.length]);
    }

    match(regex: RegExp) {
        regex = new RegExp(regex.source, regex.flags + "d");
        const res = this.value.match(regex);
        if (!res)
            return null;

        return res.map((value, i) => {
            if (value == undefined)
                return undefined;

            const start = this._range[0] + (res as any).indices[i][0] as number;
            return new RangeString(value, [start, start + value.length]);
        });
    }

    trim() {
        const start = this.start() + this.value.search(/\S|$/);
        const value = this.value.trim();

        return new RangeString(value, [start, start + value.length]);
    }
}

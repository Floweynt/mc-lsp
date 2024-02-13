import {Range} from "vscode-languageserver";

export type CommandRange = [number, number]

export function sliceRange(range: CommandRange, start: number, end?: number): CommandRange {
    return [range[0] + start, end == undefined ? range[1] : range[0] + end];
}

export function sliceLenRange(range: CommandRange, start: number, length?: number): CommandRange {
    return [range[0] + start, length == undefined ? range[1] : range[0] + start + length];
}

export function toLspRange(line: number, range: CommandRange | RangeString) {
    const actualRange = Array.isArray(range) ? range : range.range();
    return Range.create(line, actualRange[0], line, actualRange[1]);
}

export interface CommandToken {
    value: RangeString;
    isWhitespace: boolean;
}

export function between(...arg: CommandToken[]): CommandRange {
    return [
        arg[0].value.range()[0],
        arg[arg.length - 1].value.range()[1]
    ];
}

class CommandTokenizer {
    private str: string;
    private index: number;

    public constructor(str: string) {
        this.str = str;
        this.index = 0;
    }

    private consumeString() {
        const ch = this.str.charAt(this.index);
        let isEscaped = false;
        do {
            if (isEscaped) {
                this.index++;
                isEscaped = false;
            } else {
                if (this.ch() == '\\')
                    isEscaped = true;
            }

            this.index++;
        } while (this.ch() != ch);
    }

    private ch() {
        return this.str.charAt(this.index);
    }

    private parseText(): CommandToken {
        const start = this.index;
        if (this.ch() == ' ') {
            while (this.ch() == ' ') {
                this.index++;
            }

            return {
                value: new RangeString(this.str.slice(start, this.index), [start, this.index]),
                isWhitespace: true,
            };
        } else {
            const chStack: string[] = [];
            while (this.ch() != ' ' || chStack.length != 0) {
                if (this.index >= this.str.length)
                    break;

                if ('"\''.indexOf(this.ch()) != -1) {
                    this.consumeString();
                } else {
                    if ("[{".indexOf(this.ch()) != -1) {
                        chStack.push(this.ch());
                    } else if ("]}".indexOf(this.ch()) != -1) {
                        while (chStack.length != 0) {
                            const top = chStack.pop();
                            if (
                                (top == '{' && this.ch() == '}') ||
                                (top == '[' && this.ch() == ']'))
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

export class TokenReader {
    public tokens: CommandToken[];
    public index: number;
    public text: string;

    public constructor(tokens: CommandToken[], text: string) {
        this.tokens = tokens;
        this.index = 0;
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
        const substrings = limit ? this.value.split(separator, limit) : this.value.split(separator);
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
}

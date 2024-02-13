import {SemanticTokenType} from "../sem";
import {CommandToken, RangeString, TokenReader, between} from "../tok";
import {ArgParseResult} from "./argument";

export class NDimensionalVectorArgument {
    public readonly name: string;
    public readonly dim: number;
    public readonly relChars: string;
    public readonly useFloat: boolean;

    private static extractChar(chars: string, str: RangeString): [RangeString, RangeString] {
        if (chars.indexOf(str.charAt(0).str()) != -1) {
            return [str.charAt(0), str.slice(1)];
        }

        return [new RangeString(""), str];
    }

    private commonVecParse(argToken: CommandToken[], res: ArgParseResult) {
        const args = argToken.map((arg): [CommandToken, RangeString, RangeString, number] => {
            const [prefix, offset] = NDimensionalVectorArgument.extractChar(this.relChars, arg.value);
            const offsetFloat = (this.useFloat ? Number.parseFloat : Number.parseInt)(offset.str());

            if (prefix.length() != 0) {
                res.token(prefix, SemanticTokenType.POS_REL);
            }

            if (offset.length() != 0) {
                if (Number.isNaN(offsetFloat) || !Number.isFinite(offsetFloat)) {
                    res.err(offset, `${this.name}: failed to parse float ${offset}`);
                }

                res.token(offset, SemanticTokenType.NUMBER);
            }

            return [arg, prefix, offset, offsetFloat];
        });

        const prefixes = new Set<string>();

        args.forEach(arg => {
            if (arg[1].length() != 0) {
                prefixes.add(arg[1].str());
            }
        });

        if (prefixes.size > 1) {
            res.err(between(...argToken), `${this.name}: cannot mix relative coord types`);
        }
    }

    public constructor(name: string, dim: number, relChars: string, useFloat: boolean) {
        this.name = name;
        this.dim = dim;
        this.relChars = relChars;
        this.useFloat = useFloat;
    }

    public tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;

        const args: CommandToken[] = [];

        args.push(input.consume());
        for (let i = 1; i < this.dim; i++) {
            const space = input.consume();
            if (!space.isWhitespace) {
                throw Error("illegal tokenizer state");
            }

            if (space.value.str() != " ") {
                res.err(space.value, "Extra space in command");
            }

            const arg = input.consume();
            if (arg == undefined) {
                return res.err(
                    between(args[0], input.last()), 
                    `${this.name}: unexpected end-of-line command`
                );
            }
            args.push(arg);
        }

        this.commonVecParse(args, res);

        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

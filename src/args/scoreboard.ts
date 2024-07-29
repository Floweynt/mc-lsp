import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, UnquotedStringParser} from "./argument";
import {EntityParser} from "./entity";

export class TeamArgument extends UnquotedStringParser {
    public constructor() {
        super();
    }

    parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        // TODO: report suspicious team names 
        res.token(arg, SemanticTokenType.SCOREBOARD_ID);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ObjectiveArgument extends UnquotedStringParser {
    public constructor() {
        super();
    }

    parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        // TODO: report suspicious team names 
        res.token(arg, SemanticTokenType.SCOREBOARD_ID);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ScoreboardSlotArgument extends UnquotedStringParser {
    public constructor() {
        super();
    }

    parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        // TODO: report suspicious team names 
        res.token(arg, SemanticTokenType.SCOREBOARD_ID);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ObjectiveCriteriaArgument implements ArgumentParser {
    tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        res.token(input.consume(), SemanticTokenType.SCOREBOARD_ID);
        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ScoreHolderArgument implements ArgumentParser {
    private readonly entityParser: EntityParser;

    public constructor() {
        this.entityParser = new EntityParser;
    }

    tryParse(input: TokenReader): ArgParseResult {
        const arg = input.current();
        if(arg.value.str().startsWith("@")) {
            return this.entityParser.tryParse(input);
        }

        const res = new ArgParseResult;

        input.consume();
        if(arg.value.str() == "*") {
            return res.token(arg, SemanticTokenType.OPERATOR); 
        }

        return res.token(arg, SemanticTokenType.STRING); // TODO: 
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }

}

import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {ArgParseResult, ArgumentParser, UnquotedStringParser} from "./argument";

export class TeamArgument extends UnquotedStringParser {
    public constructor() {
        super();
    }

    parseFinal(input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        // TODO: report suspicious team names 
        res.token(arg.value, SemanticTokenType.TEAM);
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
        res.token(arg.value, SemanticTokenType.OBJECTIVE);
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
        res.token(arg.value, SemanticTokenType.SCOREBOARD_SLOT);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

export class ObjectiveCriteriaArgument implements ArgumentParser {
    tryParse(input: TokenReader): ArgParseResult {
        const res = new ArgParseResult;
        res.token(input.consume().value, SemanticTokenType.OBJECTIVE_CRITERIA);
        return res;
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

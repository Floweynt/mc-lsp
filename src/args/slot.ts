import {SemanticTokenType} from "../sem";
import {CommandToken, TokenReader} from "../tok";
import {range} from "../utils";
import {ArgParseResult, UnquotedStringParser} from "./argument";

export class SlotArgument extends UnquotedStringParser {
    private static readonly KNOWN_SLOTS = new Set([
        range(0, 53, 1).map(val => `container.${val}`),
        range(0, 8, 1).map(val => `hotbar.${val}`),
        range(0, 26, 1).map(val => `inventory.${val}`),
        range(0, 26, 1).map(val => `enderchest.${val}`),
        range(0, 7, 1).map(val => `villager.${val}`),
        range(0, 14, 1).map(val => `horse.${val}`),
        ["weapon", "weapon.mainhand", "weapon.offhand", "armor.head", "armor.chest", "armor.legs",
            "armor.feet", "horse.saddle", "horse.armor", "horse.chest"]
    ].flatMap(u => u));

    parseFinal(_input: TokenReader, arg: CommandToken, res: ArgParseResult): void {
        const name = arg.value;
        if (!SlotArgument.KNOWN_SLOTS.has(name.str())) {
            res.err(arg.value, `SlotArgument: unknown color '${name}'`);
        }
        res.token(arg.value, SemanticTokenType.SLOT);
    }

    public suggest(input: TokenReader): string[] {
        return [];
    }
}

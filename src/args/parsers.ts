import {ArgumentParser, ExampleEntry} from "./argument";
import {BlockStateParser} from "./blockstate";
import {ColorArgument} from "./color";
import {EntityParser} from "./entity";
import {NDimensionalVectorArgument} from "./location";
import {OperatorArgument} from "./operator";
import {NumberParser, StringParser} from "./primitive";
import {ResourceArgument} from "./resource";
import {ObjectiveArgument, ObjectiveCriteriaArgument, ScoreboardSlotArgument, TeamArgument} from "./scoreboard";
import {SlotArgument} from "./slot";
import {SwizzleArgument} from "./swizzle";
import {TimeArgument} from "./time";
import {UUIDArgument} from "./uuid";

export interface ParserInfo {
    factory: (params: object) => ArgumentParser;
    sample?: ExampleEntry[];
}

export const PARSERS: {[key: string]: ParserInfo} = {
    "minecraft:vec3": {
        factory: () => new NDimensionalVectorArgument("Vec3Argument", 3, "^~", true),
        sample: ["0 0 0", "~ ~ ~", "^ ^ ^", "^1 ^ ^-5", "0.1 -0.5 .9", "~0.5 ~1 ~-5"],
    },
    "minecraft:resource_location": {
        factory: () => new ResourceArgument(),
        sample: ["0 0", "~ ~", "0.1 -0.5", "~1 ~-2"],
    },
    "minecraft:resource": {
        factory: () => new ResourceArgument(),
        sample: ["foo", "foo:bar", "gregtech:tools/axe"],
    },
    "minecraft:uuid": {
        factory: () => new UUIDArgument(),
        sample: ["dd12be42-52a9-4a91-a8a1-11c01849e498"],
    },
    "minecraft:block_pos": {
        factory: () => new NDimensionalVectorArgument("BlockPosArgument", 3, "~^", false),
        sample: ["0 0 0", "~ ~ ~", "^ ^ ^", "^1 ^ ^-5", "~0.5 ~1 ~-5"],
    },
    "minecraft:time": {
        factory: (params) => new TimeArgument(params),
        sample: ["0d", "0s", "0t", "0"],
    },
    "minecraft:objective": {
        factory: () => new ObjectiveArgument(),
        sample: ["foo", "*", "012"],
    },
    "minecraft:angle": {
        factory: () => new NDimensionalVectorArgument("AngleArgument", 1, "~", true),
        sample: ["0", "~", "~-5"],
    },
    "minecraft:swizzle": {factory: () => new SwizzleArgument(), sample: ["xyz", "x"], },
    "minecraft:rotation": {
        factory: () => new NDimensionalVectorArgument("RotationArgument", 2, "~", true),
        sample: ["0 0", "~ ~", "~-5 ~5"],
    },
    "minecraft:column_pos": {
        factory: () => new NDimensionalVectorArgument("ColumnPosArgument", 2, "~^", false),
        sample: ["0 0", "~ ~", "~1 ~-2", "^ ^", "^-1 ^0"],
    },
    "minecraft:item_slot": {
        factory: () => new SlotArgument(),
        sample: ["container.5", "12", "weapon"],
    },
    "minecraft:resource_or_tag": {
        factory: () => new ObjectiveArgument(),
        sample: ["foo", "foo:bar", "012", "#skeletons", "#minecraft:skeletons"],
    },
    "minecraft:objective_criteria": {
        factory: () => new ObjectiveCriteriaArgument(),
        sample: ["foo", "foo.bar.baz", "minecraft:foo"],
    },
    "minecraft:scoreboard_slot": {
        factory: () => new ScoreboardSlotArgument(),
        sample: ["sidebar", "foo.bar"],
    },
    "minecraft:operation": {
        factory: () => new OperatorArgument(),
        sample: ["=", ">", "<"],
    },
    "minecraft:vec2": {
        factory: () => new NDimensionalVectorArgument("Vec2Argument", 2, "~", true),
        sample: ["0 0", "~ ~", "0.1 -0.5", "~1 ~-2"],
    },
    "minecraft:team": {
        factory: () => new TeamArgument(),
        sample: ["foo", "123"],
    },
    "minecraft:color": {
        factory: () => new ColorArgument(),
        sample: ["red", "green"],
    },
    "minecraft:dimension": {
        factory:
            () => new ResourceArgument(),
        sample: ["minecraft:overworld", "the_nether", "minecraft:the_end"],
    },
    "minecraft:block_state": {
        factory: () => new BlockStateParser(),
        sample: ["stone", "minecraft:stone", "redstone_wire[power=2]", "foo{bar=baz}"],
    },
    "brigadier:string": {
        factory: (p) => new StringParser(p),
    },
    "brigadier:integer": {
        factory: (p) => new NumberParser(true, p),
        sample: ["0", "123", "-123"],
    },
    "brigadier:float": {
        factory: (p) => new NumberParser(false, p),
        sample: ["0", "1.2", ".5", "-1", "-.5", "-1234.56"],
    },
    "brigadier:double": {
        factory: (p) => new NumberParser(false, p),
        sample: ["0", "1.2", ".5", "-1", "-.5", "-1234.56"],
    },
    "minecraft:game_profile": {
        factory: () => new EntityParser(),
        sample: ["Player", "0123", "dd12be42-52a9-4a91-a8a1-11c01849e498", "@p"],
    },
    "minecraft:entity": {
        factory: () => new EntityParser(),
        sample: ["Player", "0123", "@e", "@e[type=foo]", "dd12be42-52a9-4a91-a8a1-11c01849e498"],
    },
};

export function getParser(name: string) {
    const parser = PARSERS[name];

    // oops, I forgot to implement something  
    if (parser == undefined)
        throw Error(`Parser not implemented for ${name}`);
    return parser;
}

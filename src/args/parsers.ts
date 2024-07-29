import {SemanticTokenType} from "../sem";
import {ArgParseResult, ArgumentParser, ExampleEntry} from "./argument";
import {BlockStateLikeParser} from "./blockstate";
import {ColorArgument} from "./color";
import {EntityParser} from "./entity";
import {NDimensionalVectorArgument} from "./location";
import {CompoundTagArgument} from "./nbt";
import {OperatorArgument} from "./operator";
import {ParticleArgument} from "./particle";
import {NumberParser, NumberPropertyParams, StringParser} from "./primitive";
import {NumberRangeParser} from "./range";
import {ResourceArgument} from "./resource";
import {ObjectiveArgument, ObjectiveCriteriaArgument, ScoreHolderArgument, ScoreboardSlotArgument, TeamArgument} from "./scoreboard";
import {SlotArgument} from "./slot";
import {SwizzleArgument} from "./swizzle";
import {TimeArgument} from "./time";
import {UUIDArgument} from "./uuid";

export interface ArgParserInfo {
    factory: (params: object) => ArgumentParser;
    sample?: ExampleEntry[];
}

export const ARGUMENT_PARSERS: {[key: string]: ArgParserInfo} = {
    "minecraft:vec2": {
        factory: () => new NDimensionalVectorArgument("Vec2Argument", 2, "~", true),
        sample: ["0 0", "~ ~", "0.1 -0.5", "~1 ~-2"],
    },
    "minecraft:vec3": {
        factory: () => new NDimensionalVectorArgument("Vec3Argument", 3, "^~", true),
        sample: ["0 0 0", "~ ~ ~", "^ ^ ^", "^1 ^ ^-5", "0.1 -0.5 .9", "~0.5 ~1 ~-5"],
    },
    "minecraft:angle": {
        factory: () => new NDimensionalVectorArgument("AngleArgument", 1, "~", true),
        sample: ["0", "~", "~-5"],
    },
    "minecraft:rotation": {
        factory: () => new NDimensionalVectorArgument("RotationArgument", 2, "~", true),
        sample: ["0 0", "~ ~", "~-5 ~5"],
    },
    "minecraft:column_pos": {
        factory: () => new NDimensionalVectorArgument("ColumnPosArgument", 2, "~^", false),
        sample: ["0 0", "~ ~", "~1 ~-2", "^ ^", "^-1 ^0"],
    },
    "minecraft:block_pos": {
        factory: () => new NDimensionalVectorArgument("BlockPosArgument", 3, "~^", false),
        sample: ["0 0 0", "~ ~ ~", "^ ^ ^", "^1 ^ ^-5", "~0.5 ~1 ~-5"],
    },
    // resource location like 
    "minecraft:resource_location": {
        factory: () => new ResourceArgument("ResourceLocationArgument", false),
        sample: ["foo", "foo:bar", "gregtech:tools/axe"],
    },
    "minecraft:resource": {
        factory: () => new ResourceArgument("ResourceArgument", false),
        sample: ["foo", "foo:bar", "gregtech:tools/axe"],
    },
    "minecraft:function": {
        factory: () => new ResourceArgument("FunctionArgument", true),
        sample: ["foo", "foo:bar", "#foo"],
    },
    "minecraft:resource_or_tag": {
        factory: () => new ResourceArgument("ResourceOrTagArgument", true),
        sample: ["foo", "foo:bar", "012", "#skeletons", "#minecraft:skeletons"],
    },
    "minecraft:dimension": {
        factory: () => new ResourceArgument("DimensionArgument", false),
        sample: ["minecraft:overworld", "the_nether", "minecraft:the_end"],
    },
    "minecraft:block_state": {
        factory: () => new BlockStateLikeParser("BlockState", false),
        sample: ["stone", "minecraft:stone", "redstone_wire[power=2]", "foo{bar=baz}"],
    },
    "minecraft:block_predicate": {
        factory: () => new BlockStateLikeParser("BlockState", true),
        sample: ["stone", "minecraft:stone", "redstone_wire[power=2]", "foo{bar=baz}", "#tag[prop=val]"],
    },
    "minecraft:score_holder": {
        factory: () => new ScoreHolderArgument(),
        sample: ["Player", "0123", "*", "@e", "@s[name=str]"],
    },
    "minecraft:nbt_compound_tag": {
        factory: () => new CompoundTagArgument(),
        sample: [],
    },
    // other bullshit
    "minecraft:uuid": {
        factory: () => new UUIDArgument(),
        sample: ["dd12be42-52a9-4a91-a8a1-11c01849e498"],
    },
    "minecraft:time": {
        factory: (params) => new TimeArgument(params),
        sample: ["0d", "0s", "0t", "0"],
    },
    "minecraft:objective": {
        factory: () => new ObjectiveArgument(),
        sample: ["foo", "*", "012"],
    },
    "minecraft:swizzle": {factory: () => new SwizzleArgument(), sample: ["xyz", "x"], },
    "minecraft:item_slot": {
        factory: () => new SlotArgument(),
        sample: ["container.5", "12", "weapon"],
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
    "minecraft:team": {
        factory: () => new TeamArgument(),
        sample: ["foo", "123"],
    },
    "minecraft:color": {
        factory: () => new ColorArgument(),
        sample: ["red", "green"],
    },
    "brigadier:string": {
        factory: (p) => new StringParser(p),
    },
    "brigadier:integer": {
        factory: (p) => new NumberParser(true, p as NumberPropertyParams),
        sample: ["0", "123", "-123"],
    },
    "brigadier:float": {
        factory: (p) => new NumberParser(false, p as NumberPropertyParams),
        sample: ["0", "1.2", ".5", "-1", "-.5", "-1234.56"],
    },
    "brigadier:double": {
        factory: (p) => new NumberParser(false, p as NumberPropertyParams),
        sample: ["0", "1.2", ".5", "-1", "-.5", "-1234.56"],
    },
    "brigadier:bool": {
        factory: () => ({
            tryParse(input) {
                const res = input.consume();
                if (["true", "false"].indexOf(res.value.str()) == -1) {
                    return new ArgParseResult().err(res, "BooleanArgument: expected boolean value");
                }

                return new ArgParseResult().token(res, SemanticTokenType.KEYWORD);
            },
            suggest() {
                return [];
            },
        }),
        sample: ["true", "false"],
    },
    "minecraft:game_profile": {
        factory: () => new EntityParser(),
        sample: ["Player", "0123", "dd12be42-52a9-4a91-a8a1-11c01849e498", "@p"],
    },
    "minecraft:entity": {
        factory: () => new EntityParser(),
        sample: ["Player", "0123", "@e", "@e[type=foo]", "dd12be42-52a9-4a91-a8a1-11c01849e498"],
    },
    "minecraft:int_range": {
        factory: () => new NumberRangeParser(true),
        sample: ["0..5", "0", "-5", "-100..", "..100"],
    },
    "minecraft:float_range": {
        factory: () => new NumberRangeParser(false),
        sample: ["0..5.2", "0", "-5.4", "-100.76..", "..100"],
    },
    "minecraft:component": {
        factory: () => ({
            suggest: () => [],
            tryParse: (tok) => {
                const arg = tok.consume();
                try {
                    JSON.parse(arg.value.str());
                } catch (e) {
                    return new ArgParseResult().err(arg, "ComponentArgument: failed to parse json");
                }

                return new ArgParseResult;
            },
        }),
    },
    "minecraft:particle": {
        factory: () => new ParticleArgument(),
        sample: [],
    },
};

export function getParser(name: string) {
    const parser = ARGUMENT_PARSERS[name];

    // oops, I forgot to implement something  
    if (parser == undefined)
        throw Error(`Parser not implemented for ${name}`);
    return parser;
}

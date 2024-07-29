import {SemanticTokenType} from "../../src/sem";
import {ArgumentTest, makeTokens} from "../tester";

export const BLOCK_STATE_TEST: ArgumentTest = {
    name: "BlockState",
    argType: "minecraft:block_state",
    cases: [
        {
            name: "simple",
            value: "stone",
            token: "rrrrr",
            errors: [],
            warnings: [],
        },
        {
            name: "unknown_id",
            value: "not_real",
            token: "rrrrrrrr",
            errors: [],
            warnings: [[0, 8, "BlockState: unknown block 'minecraft:not_real'"]],
        },
        {
            name: "namespaced",
            value: "minecraft:stone",
            token: "rrrrrrrrrrrrrrr",
            errors: [],
            warnings: [],
        },
        {
            name: "illegal_id",
            value: "ab$c",
            token: "    ",
            errors: [[0, 4, "BlockState: resource path should match [a-z0-9._\\/-]+"]],
            warnings: [],
        },
        {
            name: "empty_block_state",
            value: "minecraft:stone[]",
            token: "rrrrrrrrrrrrrrr  ",
            errors: [],
            warnings: [],
        },
        {
            name: "no_tag",
            value: "#minecraft:stone",
            token: "                 ",
            errors: [[0, 10, "BlockState: resource namespace should match [a-z0-9._-]+"]],
            warnings: [],
        },
        {
            name: "property",
            value: "minecraft:barrel[facing=north,open=true]",
            token: "rrrrrrrrrrrrrrrr pppppp=LLLLL pppp=LLLL ",
            errors: [],
            warnings: [],
        },
        {
            name: "property_with_space",
            value: "minecraft:barrel[   facing    =   north   ,  open   =      true  ]",
            token: "rrrrrrrrrrrrrrrr    pppppp    =   LLLLL      pppp   =      LLLL   ",
            errors: [],
            warnings: [],
        },
        {
            name: "dupe_error",
            value: "minecraft:barrel[facing=north,facing=north]",
            token: "rrrrrrrrrrrrrrrr pppppp=LLLLL pppppp=LLLLL ",
            errors: [[30, 36, "BlockState: duplicate property facing"]],
            warnings: [],
        },
        {
            name: "value_error",
            value: "barrel[facing=false]",
            token: "rrrrrr pppppp=LLLLL ",
            errors: [
                [
                    14,
                    19,
                    "BlockState: unknown block state value 'false' in property 'facing' in block 'minecraft:barrel'. Note: allowed values are north, east, south, west, up, down"
                ]
            ],
            warnings: [],
        },
        {
            name: "malformed",
            value: "barrel[facing=,=,,k,=,]",
            token: "rrrrrr                 ",
            errors: [
                [7, 14, "BlockState: missing property value"],
                [15, 16, "BlockState: missing property key"],
                [6, 23, "BlockState: extra comma in property"],
                [18, 19, "BlockState: missing '=' in property"],
                [20, 21, "BlockState: missing property key"]
            ],
            warnings: [],
        }
    ],
};

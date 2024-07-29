import {ArgumentTest} from "../tester";

export const ENTITY_TEST_CASE: ArgumentTest = {
    name: "Entity Selector",
    argType: "minecraft:entity",
    cases: [
        {
            name: "player_name",
            value: "Player01234_4",
            token: "PPPPPPPPPPPPP",
            errors: [],
            warnings: [],
        },
        {
            name: "uuid",
            value: "123e4567-e89b-12d3-a456-426614174000",
            token: "------------------------------------",
            errors: [],
            warnings: [],
        },
        {
            name: "uuid_like_error",
            value: "123e4567-e89b-12d3-a456-426610",
            token: "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP",
            errors: [[0, 30, "EntityParser: player name too long (max 16 characters)"]],
            warnings: [],
        },
        {

            name: "player_name_too_long",
            value: "ThisIsAPlayerNameThatIsWayTooLong",
            token: "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP",
            errors: [[0, 33, "EntityParser: player name too long (max 16 characters)"]],
            warnings: [],
        },
        {
            name: "selectors",
            value: "@p @a @r @s @e",
            token: "              ",
            errors: [],
            warnings: [],
            many: true,
        },
        {
            name: "predicate_empty",
            value: "@e[]",
            token: "    ",
            errors: [],
            warnings: [],
        },
        {
            name: "predicate_test",
            value: "@e[x = 0, y = +123.33, z = -0.333, distance = ..1, dx = -2, dy = -3, dz = -10, score = {a = 1, b = 2.., c = ..3, d = 3..4}]",
            token: "   p = 0  p = 0000000  p = 000000  pppppppp = ==0  pp = 00  pp = 00  pp = 000  ppppp =  S = 0  S = 0==  S = ==0  S = 0==0  ",
            errors: [],
            warnings: [],
        },
        {
            name: "lots_of_syntax_errors",
            value: "@e[x = not_number, y = $$$, z =,, distance =u,score = {a = 1, b =, c = ..3, d = 3..4]",
            token: "   p =             p =      p =   pppppppp =  ppppp =                                ",
            errors: [
                [2, 85, "EntityParser: extra comma in property"],
                [7, 17, "EntityParser (predicate 'x'): failed to parse float"],
                [23, 26, "EntityParser (predicate 'y'): failed to parse float"],
                [28, 31, "EntityParser: empty predicate value not allowed"],
                [
                    44,
                    45,
                    "EntityParser (predicate 'distance'): failed to parse float"
                ],
                [
                    54,
                    84,
                    "EntityParser (predicate 'score'): missing closing '}' in score predicate"
                ]
            ],
            warnings: [],
        },
        {
            name: "lots_of_semantic_errors",
            value: "@e[distance = -1..-3.5, score = {a###B = -1..-3 , b= ..}]",
            token: "   pppppppp = 00==0000  ppppp =  SSSSS = 00==00   S= ==  ",
            errors: [
                [
                    14,
                    16,
                    "EntityParser (predicate 'distance'): value cannot be negative"
                ],
                [
                    18,
                    22,
                    "EntityParser (predicate 'distance'): value cannot be negative"
                ],
                [33, 38, "EntityParser (predicate 'score'): illegal score name"],
                [
                    41,
                    43,
                    "EntityParser (predicate 'score'): value cannot be negative"
                ],
                [
                    45,
                    47,
                    "EntityParser (predicate 'score'): value cannot be negative"
                ],
                [
                    53,
                    55,
                    "EntityParser (predicate 'score'): range cannot be just '..'"
                ]
            ],
            warnings: [],
        }
    ],
};



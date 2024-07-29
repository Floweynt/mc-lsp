import {SemanticTokenType} from "../../src/sem";
import {ArgumentTest} from "../tester";

export const COLOR_TEST_CASE: ArgumentTest = {
    name: "Color",
    argType: "minecraft:color",
    cases: [
        {
            name: "simple",
            value: "yellow",
            token: "CCCCCC",
            errors: [],
            warnings: [],
        },
        {
            name: "illegal_char",
            value: "yello$w",
            token: "CCCCCCC",
            errors: [[5, 6, "Illegal character in unquoted string"]],
            warnings: [],
        },
        {
            name: "unknown",
            value: "not_a_color",
            token: "CCCCCCCCCCC",
            errors: [[0, 11, "ColorArgument: unknown color 'notacolor'"]],
            warnings: [],
        }
        ,
        {
            name: "string_normalization",
            value: "Ye_LlO.w",
            token: "CCCCCCCC",
            errors: [],
            warnings: [],
        },
        {
            name: "underscore",
            value: "dark_green",
            token: "CCCCCCCCCC",
            errors: [],
            warnings: [],
        }
    ],
};


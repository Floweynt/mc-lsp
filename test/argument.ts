import {BLOCK_STATE_TEST} from "./args/blockstate";
import {COLOR_TEST_CASE} from "./args/color";
import {ENTITY_TEST_CASE} from "./args/entity";
import {run} from "./tester";

run([
    BLOCK_STATE_TEST,
    COLOR_TEST_CASE,
    ENTITY_TEST_CASE
]);

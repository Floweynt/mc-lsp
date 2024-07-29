import {inspect} from "util";
import {Config} from "./config";
import {FileManager} from "./fileman";
import {parseNbtTag} from "./args/nbt";
import {RangeString} from "./tok";
import {ArgParseResult} from "./args/argument";

/*
const config = new Config();
config.load(".");
const manager = new FileManager(config);
manager.updateFile(":3", `
execute at @s if block ~ ~ ~ #monumenta:concrete run function monumenta:quests/r1/quest25/simon/compare/complete
`);

console.log(inspect(manager.doAutocomplete({
    textDocument: {uri: ":3", },
    position: {
        line: 0,
        character: 100,
    },
})));
console.log(inspect(manager.getInfo(":3")));
*/ 

parseNbtTag(new RangeString("{lore:'{\"json\":\"va\\'l\"}'}"), new ArgParseResult);

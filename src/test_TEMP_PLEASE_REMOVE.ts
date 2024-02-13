import {inspect} from "util";
import {Config} from "./config";
import {FileManager} from "./fileman";

const config = new Config();
config.load(".");
const manager = new FileManager(config);
manager.updateFile(":3", "absorption flat a a");
console.log(inspect(manager.getInfo(":3"), {
    colors: true,
    depth: 1000,
}));

import {readFileSync} from "fs";
import path from "path";
import defaultCommands from "./data/commands.json";
import blockState from "./data/blockstate.json";

export interface BaseCommand {
    readonly type: string;
    readonly children?: {[key: string]: MCCommand};
    readonly redirect?: string[];
    readonly executable?: boolean;
}

export interface LiteralCommand extends BaseCommand {
    readonly type: "literal";
}

export interface ArgumentCommand extends BaseCommand {
    readonly type: "argument";
    readonly parser: string;
    readonly properties?: object;
}

export interface RootCommand extends BaseCommand {
    readonly type: "root";
}

export type MCCommand = LiteralCommand | ArgumentCommand | RootCommand;

export interface BlockStateProperty {
    name: string;
    value: string[];
}

export type BlockStateRegistry = {
    [key: string]: {
        [key: string]: string[];
    };
}

export class Config {
    private command: RootCommand;
    private blockStates: BlockStateRegistry;

    public constructor() {
        this.command = defaultCommands as RootCommand;
        this.blockStates = blockState;
    }

    public load(root: string) {
        this.command = JSON.parse(readFileSync(path.join(root, "command_registration.json")).toString()) as RootCommand;
    }

    public getCommand() {
        return this.command;
    }

    public getBlockStates() {
        return this.blockStates;
    }
}

import {readFileSync} from "fs";
import path from "path";
import defaultCommands from "./data/commands.json";
import blockState from "./data/blockstate.json";
import registry from "./data/registry.json";

export interface CommandNodeBase {
    readonly type: string;
    readonly children?: {[key: string]: CommandNode};
    readonly redirect?: string[];
    readonly executable?: boolean;
}

export interface CommandLiteralNode extends CommandNodeBase {
    readonly type: "literal";
}

export interface CommandArgumentNode extends CommandNodeBase {
    readonly type: "argument";
    readonly parser: string;
    readonly properties?: object;
}

export interface CommandRootNode extends CommandNodeBase {
    readonly type: "root";
}

export type CommandNode = CommandLiteralNode | CommandArgumentNode | CommandRootNode;

export interface BlockStateProperty {
    name: string;
    value: string[];
}

export type BlockStateRegistry = {
    [key: string]: {
        [key: string]: string[];
    };
}

export type Registry = {
    [key: string]: string[];
}

export class Config {
    private command: CommandRootNode;
    private blockStates: BlockStateRegistry;
    private registry: Registry;

    public constructor() {
        this.command = defaultCommands as CommandRootNode;
        this.blockStates = blockState;
        this.registry = registry;
    }

    public load(root: string) {
        this.command = JSON.parse(readFileSync(path.join(root, "command_registration.json")).toString()) as CommandRootNode;
    }

    public getCommand() {
        return this.command;
    }

    public getBlockStates() {
        return this.blockStates;
    }


    public getRegistry() {
        return this.registry;
    }
}

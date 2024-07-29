interface Formatting {
    isUnderline: boolean;
    fg: number;
    bg: number;
    sp: number;
}

export interface FormattingInput {
    isUnderline?: boolean;
    fg?: number;
    bg?: number;
    sp?: number;
}

function exportDelta(current: Formatting | undefined, target: Formatting) {
    let res = "";
    const makeColor = (val: string, color: number) => {
        return `\x1b[${val};2;${(color >> 16) & 0xff};${(color >> 8) & 0xff};${color & 0xff}m`;
    };

    if (current == undefined || current.isUnderline != target.isUnderline) {
        res += target.isUnderline ? "\x1b[4:1m" : "\x1b[24m";
    }

    if (current == undefined || current.sp != target.sp) {
        res += makeColor("58", target.sp);
    }

    if (current == undefined || current.fg != target.fg) {
        res += makeColor("38", target.fg);
    }

    if (current == undefined || current.bg != target.bg) {
        res += makeColor("48", target.bg);
    }

    return res;
}

export class StringFormatter {
    private data: string;
    private formatting: Formatting[];

    public constructor(str: string, defaultVal: Formatting | Formatting[]) {
        this.data = str;
        if (Array.isArray(defaultVal)) {
            this.formatting = defaultVal;
        }
        else {
            this.formatting = Array(str.length).fill(defaultVal);
        }
    }

    public set(start: number, end: number, val: FormattingInput) {
        for (; start < end; start++) {
            this.formatting[start] = {
                ...this.formatting[start],
                ...val,
            };
        }
        return this;
    }

    public toString() {
        let def: Formatting | undefined = undefined;
        let res = "\x1b[0m";
        for (let i = 0; i < this.data.length; i++) {
            res += exportDelta(def, this.formatting[i]);
            res += this.data.charAt(i);
            def = this.formatting[i];
        }

        return res + "\x1b[0m";
    }

    public clone(): StringFormatter {
        return new StringFormatter(this.data, [...this.formatting]);
    }
}

export const COLORS: {[key: string]: number} = {
    "operator": 0xe59e67,
    "number": 0x8ccf7e,
    "string": 0x8ccf7e,
    "enumMember": 0xc47fd5,
    "property": 0xc4c4c4,
    "keyword": 0x67b0e8,
    "comment": 0x3b4244,
    "function": 0xe57474,
};

export const DEFAULT_FMT = {
    fg: 0xdadada,
    bg: 0x141b1e,
    sp: 0x000000,
    isUnderline: false,
};

export const FMT_ERR = {
    isUnderline: true,
    sp: 0xe74c4c,
};

export const FMT_WARN = {
    isUnderline: true,
    sp: 0xe5c76b,
};

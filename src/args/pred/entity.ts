import {SemanticTokenType} from "../../sem";
import {RangeString} from "../../tok";
import {ExampleEntry, ParseResultReporter, UNQUOTED_STRING_REGEX} from "../argument";
import {StringReader, parseProperties} from "../misc";
import {parseNbtTag} from "../nbt";
import {parseGenericResource} from "../resource";
import {FloatPredicate, FloatRangePredicate, IntRangePredicate, PositiveIntPredicate, PredicateValueParser as PredicateParser, PredicateValueParser, SimpleStringPredicate, StringWithNegationPredicate} from "./common";

export interface PredicateParserInfo {
    factory: () => PredicateParser;
    sample?: ExampleEntry[];
}

export class ScorePredicate implements PredicateValueParser {
    public static readonly EXAMPLES: string[] = ["0", "1234", "+12.34"];

    public parse(str: RangeString, res: ParseResultReporter) {
        if (!str.str().startsWith("{")) {
            res.err(str, "missing '{' in score predicate");
            return;
        }

        if (!str.str().endsWith("}")) {
            res.err(str, "missing closing '}' in score predicate");
            return;
        }

        const scores = parseProperties(str, res, {
            keyRegex: UNQUOTED_STRING_REGEX,
            valueRegex: /.+/,
            allowEmptyKey: false,
            allowEmptyValue: false,
            keyTokType: SemanticTokenType.SCOREBOARD_ID,
            err: {
                unclosed: "<unclosed unreachable>",
                badKey: "illegal score name",
                badValue: "<badValue unreachable>",
                emptyKey: "score name cannot be valid",
                emptyValue: "score value cannot be empty",
                noEq: "missing '='",
                extraComma: "extra comma in score predicate",
            },
        }, /^\{([^{]*)\}(.*)$/);

        // validate scores...
        scores?.forEach(([, value]) => {
            new IntRangePredicate(true).parse(value, res);
        });
    }

    allowEmpty = false;
}

class AdvancementParser extends StringReader {
    public constructor(str: RangeString, res: ParseResultReporter) {
        super(str, res);
    }

    private readResource() {
        return this.readWhile(/[a-z0-9._:/-]/);
    }

    private readBoolean() {
        const str = this.readUnquoted();
        if (["true", "false"].indexOf(str.str()) == -1) {
            this.res.err(str, "must be 'true' or 'false'");
        }
        this.res.token(str, SemanticTokenType.KEYWORD);

    }

    public parse() {
        this.expect("{");
        while (this.curr() != "}") {
            const resource = this.readResource();
            parseGenericResource(this.res, false, resource, SemanticTokenType.RESOURCE);
            this.skipWhitespace();
            this.expect("=", SemanticTokenType.OPERATOR);
            this.skipWhitespace();
            if (this.curr() == "{") {
                while (this.curr() != "}") {
                    this.res.token(this.readUnquoted(), SemanticTokenType.STRING);
                    this.skipWhitespace();
                    this.expect("=", SemanticTokenType.OPERATOR);
                    this.skipWhitespace();
                    this.readBoolean();
                    if (this.curr() != ",") break;
                    this.consume();
                }
                this.expect("}");
            } else {
                this.readBoolean();
            }
            if (this.curr() != ",") break;
        }

        this.expect("}");
    }
}

export const ENTITY_PREDICATE_PARSERS: {[key: string]: PredicateParserInfo} = {
    "x": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "y": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "z": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "dx": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "dy": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "dz": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "x_rotation": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "y_rotation": {
        factory: () => new FloatPredicate(),
        sample: FloatPredicate.EXAMPLES,
    },
    "distance": {
        factory: () => new FloatRangePredicate(false),
        sample: FloatRangePredicate.EXAMPLES,
    },
    "scores": {
        factory: () => new ScorePredicate(),
    },
    "tag": {
        factory: () => new StringWithNegationPredicate(true, (str, res) => {
            if (!UNQUOTED_STRING_REGEX.test(str.str())) {
                res.err(str, "invalid scoreboard tag identifier");
            }
        }, SemanticTokenType.SCOREBOARD_ID),
    },
    "team": {
        factory: () => new StringWithNegationPredicate(true, (str, res) => {
            if (!UNQUOTED_STRING_REGEX.test(str.str())) {
                res.err(str, "invalid scoreboard team identifier");
            }
        }, SemanticTokenType.SCOREBOARD_ID),
    },
    "name": {
        factory: () => new StringWithNegationPredicate(true, (str, res) => {
            // TODO: parse quoted string 

        }, SemanticTokenType.SCOREBOARD_ID),
    },
    "gamemode": {
        factory: () => new StringWithNegationPredicate(false, (str, res) => {
            if (["creative", "adventure", "survival", "spectator"].indexOf(str.str()) == -1) {
                res.err(str, "unknown gamemode");
            }
        }, SemanticTokenType.ENUM),
    },
    "limit": {
        factory: () => new PositiveIntPredicate(),
    },
    "sort": {
        factory: () => new SimpleStringPredicate(false, (str, res) => {
            if (["nearest", "furthest", "random", "arbitrary"].indexOf(str.str()) == -1) {
                res.err(str, "unknown sorting mode");
            }
        }, SemanticTokenType.ENUM),
    },
    "type": {
        factory: () => new StringWithNegationPredicate(false, (str, res) => {
            parseGenericResource(res, true, str, SemanticTokenType.RESOURCE);
        }),
    },
    "nbt": {
        factory: () => new StringWithNegationPredicate(false, (str, res) => {
            parseNbtTag(str, res);
        }),
    },
    "advancements": {
        factory: () => ({
            parse(str, res) {
                new AdvancementParser(str, res).parse();
            },
            allowEmpty: false,
        }),
    },
    "all_worlds": {
        factory: () => new SimpleStringPredicate(false, (str, res) => {
            if (["true", "false"].indexOf(str.str()) == -1) {
                res.err(str, "must be boolean");
            }

        }, SemanticTokenType.KEYWORD),
    },
    "predicate": {
        factory: () => new StringWithNegationPredicate(false, (str, res) => {
            parseGenericResource(res, false, str, SemanticTokenType.RESOURCE);
        }),
    },
};

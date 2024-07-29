export enum SemanticTokenType {
    COMMENT,
    POS_REL, // ~, ^
    NUMBER,
    STRING,
    PLAYER_NAME,

    RESOURCE,

    UUID,
    UNITS,
    SWIZZLE,
    SCOREBOARD_ID,
    
    ENUM,
    OPERATOR,
    SLOT,
    KEYWORD,
    COMMAND_LITERAL,
    PROPERTY,
}

export const SEMANTIC_TOKEN_NAMES = [
    "comment",
    "operator",
    "number",
    "string",
    "string",

    "string",

    "string",
    "string",
    "string",
    "string",
    
    "enumMember",
    "operator",
    "enumMember",
    "keyword",
    "function",
    "property"
];

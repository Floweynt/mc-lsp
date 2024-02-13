export enum SemanticTokenType {
    POS_REL, // ~, ^
    NUMBER,
    STRING,
    PLAYER_NAME,

    RESOURCE,
    TAG,
    UUID,
    UNITS,
    SWIZZLE,
    TEAM,
    OBJECTIVE,
    OBJECTIVE_CRITERIA,
    SCOREBOARD_SLOT,
    
    COLOR,
    OPERATOR,
    SLOT,
    LITERAL,
    BLOCK_STATE_PROPERTY_NAME
}

export const SEMANTIC_TOKEN_NAMES = [
    "operator",
    "number",
    "string",
    "string",

    "string",
    "string",
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
    "property"
];

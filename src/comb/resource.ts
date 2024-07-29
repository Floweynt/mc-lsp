import {RangeString} from "../tok";
import {ParserComb, chain, consumeIf, consumeWhile, withParsed} from "./comb";

export const parseResourceLocation: ParserComb = (report, str, context) => {
    let namespaceOrPath: RangeString | undefined;
    let path: RangeString | undefined;

    const res = chain(
        false, 
        withParsed(        
            consumeWhile((ch) => /[a-z0-9._/-]/.test(ch)),
            (_, str) => namespaceOrPath = str 
        ),
        consumeIf(
            withParsed( 
                consumeWhile((ch) => /[a-z0-9._/-]/.test(ch)),
                (_, str) => path = str
            ),
            ":"
        )
    )(report, str, context);


    // lets consider some cases: 
    // ":" would imply that path is != undefined and is non-empty

    return res;
};

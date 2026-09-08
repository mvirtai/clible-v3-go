import type { JSX } from "react/jsx-runtime";
import { tokenizeISLALine, getTokenClassName } from "./islaLexer";

/** 
 * Props for {@link ISLASyntaxLayer} 
 */ 
export interface ISLASyntaxLayerProps {
    /**
     * The raw ISLA line text to tokenize and render with syntax colours.
     * Must be a single line (newlines are stripped by the parent editor).
     */
    code: string;
}

/**
 * Renders a colour-coded syntax-highlighted overlay for a singleISLA DSL line.
 * 
 * This component is purely presentational: it takes araw string, tokenizes it
 * via {@link tokenizeISLALine}, and renders each token as a coloured `<span>`
 * It is placed **on top of** the the transparent `<textarea>` using absolute
 * positioning (overlay patterns), so the user sees colours while the browser 
 * manages actual text editing in the textarea unerneath.
 * 
 * @param props - See {@link ISLASyntaxLayerProps},
 * @returns An `aria-hidden` overlay div with colored token spans.
 * */
export function ISLASyntaxLayer({ code }: ISLASyntaxLayerProps): JSX.Element {
    // tokenizeISLALine is O(n) on length, React Compiler memoizes
    // this automatically, so useMemo-wrapper is not needed.
    const tokens = tokenizeISLALine(code);

    return (
        <div
            aria-hidden="true"
            className={[
                // Positioning: exact same area as the textarea underneath
                'absolute inset-0 pointer-events-none',
                // Font: must match textarea exactly (same typeface, size, line-height)
                'font-mono text-sm leading-relaxed',
                // Padding: must match textarea padding exactly
                'px-3 py-2',
                // Whitespace: preserve indentation, allow natural token wrapping
                'whitespace-pre-wrap',
                // Z-index: overlay must sit above the textarea (z-10)
                'z-10',
            ].join(' ')}
        >
            {tokens.map((token, index) => (
                <span
                    key={index}
                    className={getTokenClassName(token.type)}
                >
                    {token.text}
                </span>
            ))}
        </div>
    )
    
}

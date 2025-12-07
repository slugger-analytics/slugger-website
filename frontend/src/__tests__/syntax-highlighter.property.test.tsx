/**
 * **Feature: security-vulnerability-mitigation, Property 1: Syntax Highlighter Rendering Consistency**
 * **Validates: Requirements 2.4, 4.1**
 * 
 * Property: For any valid code string and for any supported programming language,
 * the SyntaxHighlighter component SHALL render without throwing errors and SHALL
 * produce valid React elements containing the code content.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

describe('SyntaxHighlighter after v16 upgrade', () => {
    const supportedLanguages = ['javascript', 'typescript', 'json', 'text', 'bash'];

    it('renders any valid code string without errors (Property 1)', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 0, maxLength: 1000 }),
                fc.constantFrom(...supportedLanguages),
                (codeString, language) => {
                    const { container } = render(
                        <SyntaxHighlighter language={language} style={oneDark}>
                            {codeString}
                        </SyntaxHighlighter>
                    );

                    // Should render without throwing
                    expect(container).toBeTruthy();

                    // Should produce a valid DOM element
                    expect(container.querySelector('pre')).toBeTruthy();

                    // Should contain the code content (normalized for whitespace)
                    const normalizedCode = codeString.replace(/\n$/, '').trim();
                    if (normalizedCode.length > 0) {
                        // Check that at least the beginning of the code is present
                        const textContent = container.textContent || '';
                        expect(textContent).toContain(normalizedCode.substring(0, Math.min(50, normalizedCode.length)));
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

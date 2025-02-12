import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark as markdownStyle } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="prose dark:prose-invert max-w-none text-sm">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 text-sm">{children}</p>,
          
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>,
          
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 text-sm">{children}</ol>,
          
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return inline ? (
              <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 whitespace-normal text-sm" {...props}>
                {children}
              </code>
            ) : (
              <div className="rounded-lg overflow-hidden my-3 w-full">
                <SyntaxHighlighter
                  language={match ? match[1] : ''}
                  style={markdownStyle}
                  PreTag="div"
                  customStyle={{ fontSize: '0.875rem' }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 my-3 italic text-sm">
              {children}
            </blockquote>
          ),
          
          a: ({ href, children }) => (
            <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
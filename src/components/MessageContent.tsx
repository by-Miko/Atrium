import { Fragment, type ReactNode } from 'react';

interface MessageContentProps {
  content: string;
  variant?: 'user' | 'assistant';
}

function sanitizeRenderedText(raw: string): string {
  // Strip unsafe control & bidirectional override characters while keeping newlines/tabs intact.
  // All content is rendered exclusively via React JSX text nodes (never dangerouslySetInnerHTML),
  // guaranteeing raw HTML tags like <script> or inline event handlers are strictly escaped as inert text.
  return raw.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,
    ''
  );
}

function renderInlineFormatting(text: string, variant: 'user' | 'assistant'): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenRegex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`b-${keyCounter++}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em
          key={`i-${keyCounter++}`}
          className="italic"
          style={{
            color:
              variant === 'user'
                ? 'var(--chat-user-action-color, #E2DAFF)'
                : 'var(--chat-action-color, #CBD5E1)',
          }}
        >
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`c-${keyCounter++}`}
          className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[0.86em] text-[var(--theme-accent)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MessageContent({
  content,
  variant = 'assistant',
}: MessageContentProps) {
  if (!content) return null;

  const safeContent = sanitizeRenderedText(content);
  const segments = safeContent.split(/(```[\s\S]*?```)/g);

  return (
    <div
      className="space-y-2.5 leading-[1.64] break-words"
      style={{
        fontFamily: 'var(--chat-font-family, inherit)',
        fontSize: 'var(--chat-font-size, 15px)',
        color: 'var(--chat-dialogue-color, #F1F5F9)',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.65)',
      }}
    >
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const inner = segment.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const language =
            firstNewline > 0 ? inner.slice(0, firstNewline).trim() : '';
          const codeBody =
            firstNewline >= 0 ? inner.slice(firstNewline + 1) : inner;

          return (
            <div
              key={`code-${segIdx}`}
              className="overflow-x-auto rounded-2xl border border-white/10 bg-black/55 p-3.5 backdrop-blur-md"
            >
              {language ? (
                <div className="mb-2 font-mono text-[11px] text-white/55">
                  {language}
                </div>
              ) : null}
              <pre className="font-mono text-[13px] leading-relaxed text-white/90">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = segment.split(/\n{2,}/);
        return (
          <Fragment key={`txt-${segIdx}`}>
            {paragraphs.map((paragraph, pIdx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              const lines = paragraph.split('\n');
              return (
                <p key={`p-${segIdx}-${pIdx}`} className="whitespace-pre-wrap">
                  {lines.map((line, lIdx) => (
                    <Fragment key={`l-${lIdx}`}>
                      {renderInlineFormatting(line, variant)}
                      {lIdx < lines.length - 1 ? <br /> : null}
                    </Fragment>
                  ))}
                </p>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * ShaderEditor — GLSL fragment shader editor with line numbers,
 * tab-indent support, and error line highlighting.
 */
import React, { useRef, useCallback, useState, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (source: string) => void;
  errorLines?: number[];
  readOnly?: boolean;
}

export const ShaderEditor: React.FC<Props> = ({ value, onChange, errorLines = [], readOnly = false }) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    setLineCount(Math.max(1, value.split('\n').length));
  }, [value]);

  const syncScroll = useCallback(() => {
    if (textRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab inserts 2 spaces instead of moving focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = ta.value.substring(0, start);
      const after = ta.value.substring(end);
      const newVal = before + '  ' + after;
      onChange(newVal);
      // Restore cursor position after React re-renders
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [onChange]);

  const errorSet = new Set(errorLines);

  return (
    <div
      className="flex"
      style={{
        flex: 1,
        minHeight: 0,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        background: '#0d0f14',
      }}
    >
      {/* Line number gutter */}
      <div
        ref={gutterRef}
        className="shrink-0 select-none overflow-hidden"
        style={{
          width: 38,
          padding: '8px 0',
          background: '#0d0f14',
          borderRight: '1px solid var(--color-border)',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 11,
          lineHeight: '18px',
          textAlign: 'right',
          color: 'var(--color-text-disabled)',
          userSelect: 'none',
          overflowY: 'hidden',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const lineNum = i + 1;
          const isError = errorSet.has(lineNum);
          return (
            <div
              key={lineNum}
              style={{
                height: 18,
                paddingRight: 6,
                color: isError ? '#ff5555' : undefined,
                background: isError ? 'rgba(255,80,80,0.15)' : undefined,
                fontWeight: isError ? 700 : 400,
              }}
            >
              {lineNum}
            </div>
          );
        })}
      </div>

      {/* Textarea */}
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className="flex-1 resize-none outline-none"
        style={{
          padding: '8px 10px',
          background: 'transparent',
          color: '#c8ccd4',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 11,
          lineHeight: '18px',
          border: 'none',
          tabSize: 2,
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          overflowX: 'auto',
          minHeight: 200,
        }}
      />
    </div>
  );
};
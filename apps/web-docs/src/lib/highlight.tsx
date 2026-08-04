const CODE_COLORS = {
  plain: "#EDEDEF",
  comment: "#8B949E",
  string: "#A5D6FF",
  keyword: "#FF7B72",
  number: "#79C0FF",
  flag: "#FFA657",
  prop: "#79C0FF",
  fn: "#D2A8FF",
  prompt: "#8B949E",
} as const;

type CodeType = Exclude<keyof typeof CODE_COLORS, "plain"> | "plain";

const TYPE_COLORS: Record<CodeType, string> = {
  comment: CODE_COLORS.comment,
  string: CODE_COLORS.string,
  keyword: CODE_COLORS.keyword,
  number: CODE_COLORS.number,
  flag: CODE_COLORS.flag,
  prop: CODE_COLORS.prop,
  fn: CODE_COLORS.fn,
  prompt: CODE_COLORS.prompt,
  plain: CODE_COLORS.plain,
};

const TOKENIZER =
  /(?<comment>\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|(?<string>`[^`]*`|"[^"\n]*"|'[^'\n]*')|(?<keyword>\b(?:import|from|export|default|const|let|var|function|return|async|await|new|type|interface|extends|class|throw|throws|in|of|as|if|else|true|false|null|undefined|typeof|void)\b)|(?<number>\b(?:0|[1-9]\d*)(?:\.\d+)?\b)|(?<flag>--?[A-Za-z][\w-]*)|(?<fn>[A-Za-z_$][\w$]*(?=\s*\())|(?<type>\b[A-Z][A-Za-z0-9]*\b)|(?<prop>[A-Za-z_$][\w$-]*(?=:))|(?<prompt>\$)/g;

interface Token {
  text: string;
  color: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKENIZER.lastIndex = 0;

  while ((match = TOKENIZER.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: code.slice(lastIndex, match.index),
        color: CODE_COLORS.plain,
      });
    }

    const groups = match.groups as Record<string, string | undefined>;
    const type = (Object.keys(groups) as CodeType[]).find(
      (name) => groups[name] !== undefined
    );

    tokens.push({
      text: match[0],
      color: TYPE_COLORS[type ?? "plain"],
    });

    lastIndex = TOKENIZER.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({
      text: code.slice(lastIndex),
      color: CODE_COLORS.plain,
    });
  }

  return tokens;
}

export function Code({ code }: { code: string }) {
  const tokens = tokenize(code);

  return (
    <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-[#EDEDEF]">
      <code>
        {tokens.map((token, i) => (
          <span key={i} style={{ color: token.color }}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

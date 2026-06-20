export interface StageAKeyInput {
  templateContentHash?: string;
  templateId?: string;
  props?: Record<string, unknown>;
}

const djb2 = (input: string): string => {
  let hash = 5381;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) + (input.codePointAt(i) ?? 0);
  }

  return Math.abs(hash).toString(36);
};

export const createStageAKey = (input: StageAKeyInput): string => djb2(JSON.stringify(input));

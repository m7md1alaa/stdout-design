import type { Node } from "takumi-js";
import { fromJsx } from "takumi-js/helpers/jsx";

export interface CompiledTemplate {
  node: Node;
  stylesheets: string[];
}

export const compileTemplate = async (
  element: Parameters<typeof fromJsx>[0],
  options?: Parameters<typeof fromJsx>[1]
): Promise<CompiledTemplate> => {
  const result = await fromJsx(element, options);

  return {
    node: result.node,
    stylesheets: result.stylesheets,
  };
};

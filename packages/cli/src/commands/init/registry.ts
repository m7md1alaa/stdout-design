const REGISTRY_URL = "https://registry.npmjs.org/@stdout-design/cli/latest";

export const getLatestVersion = async (): Promise<string | null> => {
  try {
    const response = await fetch(REGISTRY_URL);
    if (response.status !== 200) {
      return null;
    }
    const data = (await response.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
};

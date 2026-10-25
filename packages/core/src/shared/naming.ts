export interface NamingOptions {
  templateId: string;
  locale: string;
  presetId: string;
  rowKey: string;
  format?: string;
}

export const generateOutputFilename = (options: NamingOptions): string => {
  const { templateId, locale, presetId, rowKey, format = "png" } = options;

  return `${templateId}.${locale}.${presetId}.${rowKey}.${format}`;
};

import { ErrorCode } from "@stdout-design/core";

export const getExitCode = (errorCode: ErrorCode): number => {
  switch (errorCode) {
    case ErrorCode.CONFIG_NOT_FOUND:
    case ErrorCode.CONFIG_INVALID:
    case ErrorCode.PROP_VALIDATION_FAILED:
    case ErrorCode.TEMPLATE_NOT_FOUND:
    case ErrorCode.TEMPLATE_LOAD_FAILED:
    case ErrorCode.TEMPLATE_INVALID_EXPORT: {
      return 2;
    }
    default: {
      return 1;
    }
  }
};

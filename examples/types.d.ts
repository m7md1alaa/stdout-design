import "react";

declare module "react" {
  interface DOMAttributes<T> {
    tw?: string;
  }
}

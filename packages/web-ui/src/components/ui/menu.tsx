"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type * as React from "react";

import { cn } from "@/lib/utils";

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export const MenuTrigger = (
  props: MenuPrimitive.Trigger.Props
): React.ReactElement => (
  <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
);

export const MenuPopup = ({
  className,
  align = "end",
  side = "bottom",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset"
  >): React.ReactElement => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner
      align={align}
      className="z-50"
      side={side}
      sideOffset={sideOffset}
    >
      <MenuPrimitive.Popup
        className={cn(
          "bg-popover text-popover-foreground border-border min-w-52 origin-(--transform-origin) rounded-lg border p-1 text-sm shadow-lg transition-opacity duration-150 outline-none data-ending-style:opacity-0 data-starting-style:opacity-0",
          className
        )}
        data-slot="menu-popup"
        {...props}
      />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
);

export const MenuItem = ({
  className,
  ...props
}: MenuPrimitive.Item.Props): React.ReactElement => (
  <MenuPrimitive.Item
    className={cn(
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground flex min-h-8 cursor-default items-center justify-between gap-6 rounded-md px-2 py-1 outline-none data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    data-slot="menu-item"
    {...props}
  />
);

export const MenuSeparator = ({
  className,
  ...props
}: MenuPrimitive.Separator.Props): React.ReactElement => (
  <MenuPrimitive.Separator
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    data-slot="menu-separator"
    {...props}
  />
);

export const MenuShortcut = ({
  className,
  ...props
}: React.ComponentProps<"kbd">): React.ReactElement => (
  <kbd
    className={cn("text-muted-foreground font-mono text-xs", className)}
    {...props}
  />
);

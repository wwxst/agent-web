import * as React from "react";

export type TimelineActivityVariant = "default" | "grouped";
type ClassNames = (...values: Array<string | false | null | undefined>) => string;

export interface TimelineActivityBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  indent?: boolean;
  variant?: TimelineActivityVariant;
  /** React 19 treats ref as a normal prop; retained to mirror the compiled component. */
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Semantic reconstruction of `timeline-activity-body-20adff28ef8e.js`.
 * Inject the same class-name utility as the host bundle: a plain string join
 * is not guaranteed to match its class conflict resolution.
 */
export function createTimelineActivityBody(classNames: ClassNames) {
  return function TimelineActivityBody({
    ref,
    className,
    indent,
    variant = "default",
    ...rest
  }: TimelineActivityBodyProps) {
    const defaultSpacing = variant === "default" && "gap-2 pt-2 pb-1";
    const groupedSpacing =
      variant === "grouped" && "gap-[var(--conversation-grouped-item-gap,4px)] pt-1";

    return (
      <div
        ref={ref}
        className={classNames(
          "flex flex-col",
          defaultSpacing,
          groupedSpacing,
          indent && "ps-6",
          className,
        )}
        {...rest}
      />
    );
  };
}

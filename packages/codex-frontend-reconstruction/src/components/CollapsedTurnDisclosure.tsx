import * as React from "react";

/** These adapters must be connected to the matching Codex primitives before runtime use. */
export interface CollapsedTurnDisclosureAdapters {
  Button: React.ComponentType<any>;
  FormattedMessage: React.ComponentType<any>;
  Tooltip: React.ComponentType<any>;
  ChevronRightIcon: React.ComponentType<{ className?: string }>;
  WorkedForItemIndicator: React.ComponentType<{
    className?: string;
    status: string;
    startedAtMs?: number;
    completedAtMs?: number;
  }>;
  DeniedActionIcon: React.ComponentType<Record<string, never>>;
  formatDuration: (durationMs: number) => string;
  classNames: (...values: Array<string | false | null | undefined>) => string;
}

export interface WorkedForItem {
  status: string;
  startedAtMs?: number;
  completedAtMs?: number;
}

export interface CollapsedTurnDisclosureProps {
  label?: React.ReactNode;
  collapsedMessageCount: number;
  deniedActionCount?: number;
  workedDurationMs?: number | null;
  workedForItem?: WorkedForItem | null;
  isCollapsed: boolean;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLButtonElement>;
  onToggle: () => void;
}

/**
 * Reconstructed from `collapsed-turn-disclosure-5a24f5665073.js`.
 * The DOM hierarchy, CSS utility classes, message IDs, default copy, and ARIA
 * state mirror the bundled component. Internal design-system primitives are
 * injected so they can be mapped explicitly instead of guessed.
 */
export function createCollapsedTurnDisclosure(adapters: CollapsedTurnDisclosureAdapters) {
  const {
    Button,
    FormattedMessage,
    Tooltip,
    ChevronRightIcon,
    WorkedForItemIndicator,
    DeniedActionIcon,
    formatDuration,
    classNames,
  } = adapters;

  function WorkedForLabel({
    className,
    collapsedMessageCount,
    workedDurationMs,
    workedForItem,
  }: Pick<CollapsedTurnDisclosureProps, "collapsedMessageCount" | "workedDurationMs" | "workedForItem"> & {
    className?: string;
  }) {
    if (workedForItem != null) {
      return (
        <WorkedForItemIndicator
          className={className}
          status={workedForItem.status}
          startedAtMs={workedForItem.startedAtMs}
          completedAtMs={workedForItem.completedAtMs}
        />
      );
    }

    if (workedDurationMs != null) {
      return (
        <span className={className ?? "text-tertiary"}>
          <FormattedMessage
            id="localConversation.workedFor"
            defaultMessage="Worked for {time}"
            description="Divider shown between agent activity and the final assistant response in a completed turn"
            values={{ time: formatDuration(workedDurationMs) }}
          />
        </span>
      );
    }

    return (
      <span className={className ?? "text-tertiary"}>
        <FormattedMessage
          id="localConversation.previousMessagesSummary"
          defaultMessage="{count, plural, one {# previous message} other {# previous messages}}"
          description="Summary shown in collapsed turns when no worked-for duration is available"
          values={{ count: collapsedMessageCount }}
        />
      </span>
    );
  }

  return function CollapsedTurnDisclosure(props: CollapsedTurnDisclosureProps) {
    const {
      label,
      collapsedMessageCount,
      deniedActionCount = 0,
      workedDurationMs,
      workedForItem,
      isCollapsed,
      onFocus,
      onBlur,
      onPointerEnter,
      onPointerLeave,
      onToggle,
    } = props;

    const hasDeniedActions = deniedActionCount > 0;
    const buttonClassName = classNames(
      "inline-flex max-w-full flex-wrap text-size-chat",
      hasDeniedActions && "w-full",
    );
    const summary =
      label ?? (
        <WorkedForLabel
          className="text-inherit"
          collapsedMessageCount={collapsedMessageCount}
          workedDurationMs={workedDurationMs}
          workedForItem={workedForItem}
        />
      );
    const chevronClassName = classNames(
      "icon-2xs transition-transform duration-basic",
      isCollapsed ? "rotate-0" : "rotate-90",
    );

    return (
      <>
        <div className="text-size-chat text-secondary">
          <Button
            className={buttonClassName}
            color="ghostTertiary"
            radius="small"
            size="inline"
            aria-expanded={!isCollapsed}
            onFocus={onFocus}
            onBlur={onBlur}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={onToggle}
          >
            <span>{summary}</span>
            <ChevronRightIcon className={chevronClassName} />
            {hasDeniedActions ? (
              <Tooltip
                closeOnTriggerClick
                tooltipContent={
                  <FormattedMessage
                    id="localConversation.deniedActionsTooltip"
                    defaultMessage="{count, plural, one {Auto-review denied # action. View the action and why it was denied.} other {Auto-review denied # actions. View the actions and why they were denied.}}"
                    description="Tooltip for the denied-action count beside Worked for. Clicking this part of the disclosure opens or closes the turn's activity, where denial details can be viewed. Approving a retry does not remove a past denial from this count."
                    values={{ count: deniedActionCount }}
                  />
                }
              >
                <span
                  className="ms-auto inline-flex items-center gap-1 text-secondary"
                  data-denied-action-count
                >
                  <DeniedActionIcon />
                  <FormattedMessage
                    id="localConversation.deniedActionsCount"
                    defaultMessage="{count, plural, one {# denied action} other {# denied actions}}"
                    description="Historical number of actions denied by auto-review in this turn, shown beside Worked for. Approving a retry does not remove a past denial from this count."
                    values={{ count: deniedActionCount }}
                  />
                </span>
              </Tooltip>
            ) : null}
          </Button>
        </div>
        <div className="pt-1 text-size-chat text-secondary">
          <div className="w-full border-t border-default" />
        </div>
      </>
    );
  };
}

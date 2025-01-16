import { ReactNode } from "react";
import { BarVisualizer } from "@livekit/components-react";
import { TrackReference } from "@livekit/components-core";

type NameValueRowProps = {
  name: string;
  value?: ReactNode;
  valueColor?: string;
  audioTrack?: TrackReference;
  agentState?: string;
};

export const NameValueRow: React.FC<NameValueRowProps> = ({
  name,
  value,
  valueColor = "gray-300",
  audioTrack,
  agentState,
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex flex-row w-full items-baseline text-sm">
        <div className="grow shrink-0 text-gray-500">{name}</div>
        <div className={`text-xs shrink text-${valueColor} text-right`}>
          {value}
        </div>
      </div>
      {audioTrack && (
        <div
          className="flex items-center justify-end w-full h-6 [--lk-va-bar-width:4px] [--lk-va-bar-gap:2px]"
          style={{ '--lk-fg': `var(--tw-text-opacity,1) rgb(var(--${valueColor.replace('-', '-rgb-')}) / var(--tw-text-opacity))` } as React.CSSProperties}
        >
          <BarVisualizer
            state={agentState}
            trackRef={audioTrack}
            barCount={5}
            options={{ minHeight: 2 }}
          />
        </div>
      )}
    </div>
  );
};

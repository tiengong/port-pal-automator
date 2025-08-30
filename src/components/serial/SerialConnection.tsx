import React from "react";
import { DualChannelConnection } from "./DualChannelConnection";
import { useSerialManager } from "@/hooks/useSerialManager";

interface SerialConnectionProps {
  serialManager: ReturnType<typeof useSerialManager>;
  isSupported: boolean;
}

export const SerialConnection: React.FC<SerialConnectionProps> = ({
  serialManager,
  isSupported
}) => {
  return (
    <DualChannelConnection 
      serialManager={serialManager}
      isSupported={isSupported}
    />
  );
};
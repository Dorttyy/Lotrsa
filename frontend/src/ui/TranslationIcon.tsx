import React from "react";
import { Ionicons } from "@/src/ui/icons";

/** The same Languages artwork as the expanded Moments post action. */
export function TranslationIcon({ size = 19, color, testID }: {
  size?: number;
  color: string;
  testID: string;
}) {
  return <Ionicons name="language" size={size} color={color} testID={testID} />;
}
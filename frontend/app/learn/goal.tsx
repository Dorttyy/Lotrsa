import { Redirect } from "expo-router";

/** Preserve old goal deep links; the current screen is set-goal. */
export default function GoalRedirect() {
  return <Redirect href="/learn/set-goal" />;
}
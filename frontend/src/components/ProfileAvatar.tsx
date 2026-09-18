import React from "react";
import { Avatar } from "./Avatar";
import { countryToCode } from "@/src/constants/countries";
import { User } from "@/src/utils/api";

/** One profile-avatar presentation shared by Connect and Call, not a new style. */
export function ProfileAvatar({ user, size = 54, online, testID }: {
  user: User; size?: number; online?: boolean; testID?: string;
}) {
  return <Avatar testID={testID} name={user.name} url={user.avatar_url} size={size}
    flagCode={countryToCode(user.country)} frame={user.active_frame}
    boosted={user.boosted} online={(online ?? !!user.is_online) && !user.boosted} />;
}
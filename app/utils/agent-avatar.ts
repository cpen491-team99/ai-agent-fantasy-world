import RaccoonAvatar from "../assets/agents/raccoon.png";
import FoxAvatar from "../assets/agents/fox.png";
import BunnyAvatar from "../assets/agents/bunny.png";
import CatAvatar from "../assets/agents/cat.png";
import mouseAvatar from "../assets/agents/mouse.png";
import DefaultAvatar from "../assets/agents/default.png";

export const agentAvatarMap: Record<string, string> = {
  raccoon: RaccoonAvatar.src,
  fox: FoxAvatar.src,
  bunny: BunnyAvatar.src,
  mouse: CatAvatar.src,
};

export function getAgentAvatar(agentId: string): string {
  // Use .src here as well for the fallback
  return agentAvatarMap[agentId] ?? DefaultAvatar.src;
}

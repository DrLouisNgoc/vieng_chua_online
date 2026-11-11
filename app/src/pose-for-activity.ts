import {
  BEADS,
  BEADS_SEATED,
  BOW_SEATED,
  BOW_STANDING,
  BROOM_IDLE,
  GREET,
  IDLE,
  SEATED,
  blendPose,
  sweepPose,
  walkPose,
  type BodyPose,
} from "./body-pose";
import { BOW_SECONDS, type InteractionSnapshot } from "./interaction-state";

// Greeting while seated: legs stay crossed, arms join palms.
const GREET_SEATED: BodyPose = {
  bones: { ...SEATED.bones, ...GREET.bones },
  hipsDrop: SEATED.hipsDrop,
};

// The target pose for what the visitor is doing. Pure; scene.ts blends from
// the previous pose when the activity changes.
export function poseForActivity(snapshot: InteractionSnapshot, activitySeconds: number, walkSeconds: number): BodyPose {
  const seated = snapshot.seatIndex !== null;
  switch (snapshot.activity) {
    case "walking":
      return snapshot.holdingBroom ? sweepPose(walkSeconds) : walkPose(walkSeconds);
    case "seated":
      return SEATED;
    case "beads":
      return seated ? BEADS_SEATED : BEADS;
    case "greeting":
    case "chanting":
      return seated ? GREET_SEATED : GREET;
    case "bowing": {
      // down and back up once over the bow's duration
      const depth = Math.sin((Math.PI * Math.min(activitySeconds, BOW_SECONDS)) / BOW_SECONDS);
      return seated ? blendPose(SEATED, BOW_SEATED, depth) : blendPose(GREET, BOW_STANDING, depth);
    }
    case "idle":
      return snapshot.holdingBroom ? BROOM_IDLE : IDLE;
  }
}

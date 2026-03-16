// ---------------------------------------------------------------------------
// Grail Ball -- Replay System
// Records key moments (goals, saves, fouls) and plays them back with
// multiple camera angles and slow motion.
// ---------------------------------------------------------------------------

import { GB_REPLAY } from "./GrailBallConfig";
import {
  type GBMatchState, type GBReplayMoment, type GBReplayFrame,
  captureReplayFrame, saveReplayMoment,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// Continuous recording (ring buffer)
// ---------------------------------------------------------------------------
let _frameAccumulator = 0;

export function tickReplayRecording(state: GBMatchState, dt: number): void {
  if (state.replayActive) return; // don't record during playback

  _frameAccumulator += dt;
  if (_frameAccumulator >= GB_REPLAY.FRAME_INTERVAL) {
    _frameAccumulator -= GB_REPLAY.FRAME_INTERVAL;
    state.replayRecording.push(captureReplayFrame(state));
    if (state.replayRecording.length > GB_REPLAY.MAX_FRAMES) {
      state.replayRecording.shift();
    }
  }
}

// ---------------------------------------------------------------------------
// Save a key moment from the recording buffer
// ---------------------------------------------------------------------------
export function recordKeyMoment(
  state: GBMatchState,
  type: GBReplayMoment["type"],
  description: string,
  scorerId?: number,
  teamIndex?: number,
): void {
  saveReplayMoment(state, type, description, scorerId, teamIndex);
}

// ---------------------------------------------------------------------------
// Start replay playback
// ---------------------------------------------------------------------------
export function startReplay(state: GBMatchState, momentIndex?: number): boolean {
  const idx = momentIndex ?? state.replayMoments.length - 1;
  if (idx < 0 || idx >= state.replayMoments.length) return false;

  const moment = state.replayMoments[idx];
  if (!moment || moment.frames.length === 0) return false;

  state.replayActive = true;
  state.replayCurrentMoment = moment;
  state.replayPlaybackIndex = 0;
  state.replayPlaybackTimer = 0;
  state.replayCameraAngle = 0;

  return true;
}

// ---------------------------------------------------------------------------
// Tick replay playback
// Returns true if replay is still active, false when done.
// ---------------------------------------------------------------------------
export function tickReplayPlayback(state: GBMatchState, dt: number): boolean {
  if (!state.replayActive || !state.replayCurrentMoment) return false;

  const moment = state.replayCurrentMoment;
  const slowDt = dt * GB_REPLAY.SLOW_MO_FACTOR;

  state.replayPlaybackTimer += slowDt;

  // Advance frame index based on time
  const frameTime = GB_REPLAY.FRAME_INTERVAL;
  const targetFrame = Math.floor(state.replayPlaybackTimer / frameTime);

  if (targetFrame >= moment.frames.length) {
    // Replay complete
    stopReplay(state);
    return false;
  }

  state.replayPlaybackIndex = targetFrame;
  return true;
}

// ---------------------------------------------------------------------------
// Get current replay frame data
// ---------------------------------------------------------------------------
export function getCurrentReplayFrame(state: GBMatchState): GBReplayFrame | null {
  if (!state.replayActive || !state.replayCurrentMoment) return null;
  const frames = state.replayCurrentMoment.frames;
  const idx = Math.min(state.replayPlaybackIndex, frames.length - 1);
  return frames[idx] ?? null;
}

// ---------------------------------------------------------------------------
// Cycle replay camera angle
// ---------------------------------------------------------------------------
export function cycleReplayCamera(state: GBMatchState): void {
  if (!state.replayActive) return;
  state.replayCameraAngle = (state.replayCameraAngle + 1) % GB_REPLAY.CAMERA_ANGLES.length;
}

// ---------------------------------------------------------------------------
// Get current camera angle name
// ---------------------------------------------------------------------------
export function getReplayCameraAngle(state: GBMatchState): (typeof GB_REPLAY.CAMERA_ANGLES)[number] {
  return GB_REPLAY.CAMERA_ANGLES[state.replayCameraAngle] ?? "wide";
}

// ---------------------------------------------------------------------------
// Stop replay
// ---------------------------------------------------------------------------
export function stopReplay(state: GBMatchState): void {
  state.replayActive = false;
  state.replayCurrentMoment = null;
  state.replayPlaybackIndex = 0;
  state.replayPlaybackTimer = 0;
}

// ---------------------------------------------------------------------------
// Get replay progress (0..1)
// ---------------------------------------------------------------------------
export function getReplayProgress(state: GBMatchState): number {
  if (!state.replayActive || !state.replayCurrentMoment) return 0;
  const total = state.replayCurrentMoment.frames.length;
  if (total === 0) return 0;
  return state.replayPlaybackIndex / total;
}

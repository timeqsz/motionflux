export type SfxKind =
  | 'whoosh'
  | 'whoosh-soft'
  | 'pop'
  | 'pop-soft'
  | 'tick'
  | 'click'
  | 'sub-hit'
  | 'riser'
  | 'chime'
  | 'shutter';

export interface ProceduralSfxCue {
  sfx: SfxKind;
  atFrame?: number;
  atSec?: number;
  gain?: number;
  pitch?: number;
  durationSec?: number;
  pan?: number;
  seed?: number;
}

export interface FileAudioCue {
  src: string;
  atFrame?: number;
  atSec?: number;
  offsetSec?: number;
  durationSec?: number;
  gain?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  loop?: boolean;
}

export type AudioCue = ProceduralSfxCue | FileAudioCue;

export interface StageScene {
  id: string;
  label?: string;
  startFrame: number;
  endFrame: number;
}

export interface StageMeta {
  version: 'stage-1';
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  background?: string;
  scenes: StageScene[];
  audio: AudioCue[];
}

export type AuditSeverity = 'error' | 'warning';

export type AuditIssueCode =
  | 'CLIPPED_OUTSIDE_STAGE'
  | 'TEXT_OVERFLOW'
  | 'ELEMENT_OVERLAP'
  | 'BROKEN_IMAGE'
  | 'BROKEN_VIDEO'
  | 'FONT_LOAD_ERROR'
  | 'SAFE_AREA_WARNING'
  | 'TINY_TEXT'
  | 'BLANK_FRAME';

export interface AuditRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AuditIssue {
  code: AuditIssueCode;
  severity: AuditSeverity;
  frame: number;
  sceneId?: string;
  target: string;
  otherTarget?: string;
  message: string;
  rect?: AuditRect;
}

export interface FrameAuditResult {
  frame: number;
  timeSec: number;
  sceneId?: string;
  visibleElements: number;
  issues: AuditIssue[];
}

export interface StageAuditReport {
  entry: string;
  meta: StageMeta;
  passed: boolean;
  summary: {
    auditedFrames: number;
    errors: number;
    warnings: number;
  };
  frames: FrameAuditResult[];
  issues: AuditIssue[];
  contactSheet?: string;
  browser: string;
}

export interface StageVideoReport {
  codec: string;
  pixelFormat: string;
  alpha: boolean;
  width: number;
  height: number;
  frames: number;
  durationSeconds: number;
  frameRate: string;
  hasAudio: boolean;
  audioCodec?: string;
}

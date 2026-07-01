import React from 'react';
import {
	AbsoluteFill,
	Img,
	Sequence,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// ============================================================================
// SHARED LAYOUT
// Once an element (bag, hook text, tag, ...) has settled in a scene, it
// keeps appearing in every later scene at the exact same size/position via
// these shared components (rendered with scale=1, i.e. no transform), so
// nothing ever visually jumps at a scene cut.
// ============================================================================

const BACKGROUND_IMAGE = 'images/processed/background.jpeg';
const BAG_CASH_IMAGE = 'images/processed/bag-cash.png';
const TAG_IMAGE = 'images/processed/blank-tag.png';
const PERSON_REACHING_IMAGE = 'images/processed/person-reaching.png';
const THOUGHT_BUBBLE_IMAGE = 'images/processed/thought-bubble.png';

// Punchy, quick-settling spring shared by any element that needs a snappy
// pop-in bounce inside a short (~20-30 frame) window, as opposed to the
// bag's own slower, floatier bounce.
const FAST_BOUNCE_SPRING_CONFIG = {damping: 10, mass: 0.5, stiffness: 300} as const;

const SceneBackground: React.FC = () => (
	<Img
		src={staticFile(BACKGROUND_IMAGE)}
		style={{
			width: '100%',
			height: '100%',
			objectFit: 'cover',
		}}
	/>
);

const BAG_WIDTH = '65%';
const BAG_PADDING_BOTTOM = '20%';

const Bag: React.FC<{scale?: number}> = ({scale = 1}) => (
	<AbsoluteFill
		style={{
			justifyContent: 'flex-end',
			alignItems: 'center',
			paddingBottom: BAG_PADDING_BOTTOM,
		}}
	>
		<Img
			src={staticFile(BAG_CASH_IMAGE)}
			style={{
				width: BAG_WIDTH,
				transform: `scale(${scale})`,
			}}
		/>
	</AbsoluteFill>
);

const HOOK_TEXT = '$1,000,000';

const HookText: React.FC<{scale?: number}> = ({scale = 1}) => (
	<AbsoluteFill
		style={{
			justifyContent: 'flex-start',
			alignItems: 'center',
			paddingTop: '15%',
		}}
	>
		<div
			style={{
				transform: `scale(${scale})`,
				fontFamily: 'Arial, Helvetica, sans-serif',
				fontWeight: 900,
				fontSize: 130,
				color: '#ffffff',
				textAlign: 'center',
				WebkitTextStroke: '10px #000000',
				paintOrder: 'stroke fill',
				textShadow: '0 0 30px rgba(34, 197, 94, 0.85), 0 0 70px rgba(34, 197, 94, 0.55)',
			}}
		>
			{HOOK_TEXT}
		</div>
	</AbsoluteFill>
);

const TAG_WIDTH_PX = 220;
// Anchored near the bag's right shoulder/handle-base, just below the handle
// loop. The tag's own loop sits at its left edge, so the element is nudged
// left/up from this anchor rather than centered on it.
const TAG_ANCHOR_LEFT = '66%';
const TAG_ANCHOR_TOP = '32%';

const Tag: React.FC<{scale?: number}> = ({scale = 1}) => (
	<div
		style={{
			position: 'absolute',
			left: TAG_ANCHOR_LEFT,
			top: TAG_ANCHOR_TOP,
			transform: `translate(-15%, -35%) scale(${scale})`,
		}}
	>
		<Img src={staticFile(TAG_IMAGE)} style={{width: TAG_WIDTH_PX, display: 'block'}} />
	</div>
);

// person-reaching.png's content (a crouching figure reaching rightward) only
// fills the middle band of its 768x1376 canvas. Instead of relying on flex
// alignment (which would anchor the mostly-transparent image box, not the
// visible figure), it's positioned with an explicit top-left so the
// figure's feet line up with the same ground line the bag stands on
// (frame bottom minus BAG_PADDING_BOTTOM, i.e. y=1536 on a 1920-tall frame).
const PERSON_WIDTH_PX = 500;
const PERSON_LEFT_PX = 0;
const PERSON_TOP_PX = 851;

const PersonReaching: React.FC<{scale?: number}> = ({scale = 1}) => (
	<div
		style={{
			position: 'absolute',
			left: PERSON_LEFT_PX,
			top: PERSON_TOP_PX,
			transformOrigin: 'bottom left',
			transform: `scale(${scale})`,
		}}
	>
		<Img
			src={staticFile(PERSON_REACHING_IMAGE)}
			style={{width: PERSON_WIDTH_PX, display: 'block'}}
		/>
	</div>
);

// The bag's silhouette is wide and its left edge creeps in as it goes down
// (from x~518 near the handle to x~200 near the shoulder), so there isn't
// room for the bubble directly above the head (x=254, top=1078) without
// its transparent halftone gaps letting the bag's dot pattern bleed
// through. Positioned instead in the clear gap up and to the left of the
// head, below the "$1,000,000" text (which ends around y=468) and clear
// of the bag's edge (>=x~279 through this vertical range) down to y=740.
const BUBBLE_WIDTH_PX = 230;
const BUBBLE_LEFT_PX = 30;
const BUBBLE_TOP_PX = 503;

const ThoughtBubble: React.FC<{scale?: number}> = ({scale = 1}) => (
	<div
		style={{
			position: 'absolute',
			left: BUBBLE_LEFT_PX,
			top: BUBBLE_TOP_PX,
			transformOrigin: 'bottom center',
			transform: `scale(${scale})`,
		}}
	>
		<Img
			src={staticFile(THOUGHT_BUBBLE_IMAGE)}
			style={{width: BUBBLE_WIDTH_PX, display: 'block'}}
		/>
	</div>
);

// ============================================================================
// SCENE 1 — "What if you randomly found $1,000,000… in cash?"
// Frames 0-120 (0.0s-4.0s @ 30fps)
//
// - background.jpeg fills the frame
// - bag-cash.png is centered, lower-middle of the screen, scaling in with an
//   overshoot bounce (0-45), settling (45-60), then fully static (60-120).
// - "$1,000,000" pops in above the bag once it's mostly settled.
// ============================================================================

const SCENE_1_VO = 'What if you randomly found $1,000,000… in cash?';
const SCENE_1_DURATION = 120;

// Bounce settles by frame 60 (see tuning below); clamping the frame fed into
// spring() means the value never changes again after that, so the hold
// (frames 60-120) is guaranteed perfectly static rather than relying on the
// spring asymptoting close enough to 1.
const SCENE_1_SETTLE_FRAME = 60;

// "$1,000,000" hook text: pops in on its own spring once the bag has mostly
// settled, and is fully locked in well before the bag's own hold begins.
const SCENE_1_TEXT_START_FRAME = 30;
const SCENE_1_TEXT_SETTLE_OFFSET = 20; // settles at frame 30 + 20 = 50

const Scene1: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Bouncy, low-damping config: overshoots past 100% around frame ~10-11
	// (peak ~120%), dips back under 100% around frame ~21, and settles to a
	// steady 100% by frame ~60.
	const bagScale = spring({
		frame: Math.min(frame, SCENE_1_SETTLE_FRAME),
		fps,
		config: {
			damping: 9,
			mass: 1,
			stiffness: 100,
		},
	});

	// Snappier, punchier bounce than the bag's: overshoots to ~124% around
	// offset 4, dips to ~94% around offset 8, and settles by offset 20
	// (i.e. frame 50). Clamped so the text is pixel-locked afterwards.
	const textOffset = Math.min(
		Math.max(0, frame - SCENE_1_TEXT_START_FRAME),
		SCENE_1_TEXT_SETTLE_OFFSET,
	);
	const textScale = spring({
		frame: textOffset,
		fps,
		config: FAST_BOUNCE_SPRING_CONFIG,
	});
	// Nothing to render before the pop-in starts.
	const textVisible = frame >= SCENE_1_TEXT_START_FRAME;

	return (
		<AbsoluteFill>
			<SceneBackground />
			{textVisible ? <HookText scale={textScale} /> : null}
			<Bag scale={bagScale} />
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 2 — "Like just sitting there."
// Frames 120-180 (4.0s-6.0s @ 30fps)
//
// - Same background; bag and "$1,000,000" text remain in their Scene 1
//   settled positions.
// - Local frames 0-30 (global 4.0s-5.0s): bag holds completely still.
// - Local frames 30-60 (global 5.0s-6.0s): a barely-there idle "breathing"
//   wobble (~1% scale, one slow sine cycle) — no pop, no bounce.
// ============================================================================

const SCENE_2_VO = 'Like just sitting there.';
const SCENE_2_DURATION = 60;

// Local frame where the micro-movement is allowed to begin; before this the
// bag is pixel-static.
const SCENE_2_IDLE_START = 30;
const SCENE_2_IDLE_AMPLITUDE = 0.01; // 1% scale wobble, intentionally subtle

const Scene2: React.FC = () => {
	const frame = useCurrentFrame();

	const idleFrame = Math.max(0, frame - SCENE_2_IDLE_START);
	const idleDuration = SCENE_2_DURATION - SCENE_2_IDLE_START;
	const idleWobble =
		frame < SCENE_2_IDLE_START
			? 0
			: Math.sin((idleFrame / idleDuration) * Math.PI * 2) * SCENE_2_IDLE_AMPLITUDE;

	const bagScale = 1 + idleWobble;

	return (
		<AbsoluteFill>
			<SceneBackground />
			<HookText />
			<Bag scale={bagScale} />
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 3 — "No name. No note."
// Frames 180-240 (6.0s-8.0s @ 30fps)
//
// - Same background; bag and "$1,000,000" text remain in their settled
//   positions.
// - blank-tag.png pops in near the bag's handle/shoulder, small and to the
//   side, as if tied on. Local frames 0-30 (global 6.0s-7.0s): overshoot
//   bounce. Local frames 30-60 (global 7.0s-8.0s): fully static hold.
// ============================================================================

const SCENE_3_VO = 'No name. No note.';
const SCENE_3_DURATION = 60;
const SCENE_3_TAG_SETTLE_FRAME = 30;

const Scene3: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const tagScale = spring({
		frame: Math.min(frame, SCENE_3_TAG_SETTLE_FRAME),
		fps,
		config: FAST_BOUNCE_SPRING_CONFIG,
	});

	return (
		<AbsoluteFill>
			<SceneBackground />
			<HookText />
			<Bag />
			<Tag scale={tagScale} />
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 4 — "First instinct? Most people think:"
// Frames 240-330 (8.0s-11.0s @ 30fps)
//
// - Same background; bag, "$1,000,000" text, and tag remain in their
//   settled positions.
// - person-reaching.png pops in on the left, crouching and reaching toward
//   the bag. Local frames 0-30 (global 8.0s-9.0s): overshoot bounce.
//   Local frames 30-90 (global 9.0s-11.0s): fully static hold.
// ============================================================================

const SCENE_4_VO = 'First instinct? Most people think:';
const SCENE_4_DURATION = 90;
const SCENE_4_PERSON_SETTLE_FRAME = 30;

const Scene4: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const personScale = spring({
		frame: Math.min(frame, SCENE_4_PERSON_SETTLE_FRAME),
		fps,
		config: {
			damping: 9,
			mass: 1,
			stiffness: 100,
		},
	});

	return (
		<AbsoluteFill>
			<SceneBackground />
			<HookText />
			<Bag />
			<Tag />
			<PersonReaching scale={personScale} />
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 5 — "'It's mine now.'"
// Frames 330-390 (11.0s-13.0s @ 30fps)
//
// - Same background; bag, "$1,000,000" text, tag, and person-reaching
//   remain in their settled positions.
// - thought-bubble.png (with a dollar sign) pops in above the character's
//   head. Local frames 0-25 (global 11.0s-11.8s): overshoot bounce. Local
//   frames 25-60 (global 11.8s-13.0s): fully static hold.
// ============================================================================

const SCENE_5_VO = "'It's mine now.'";
const SCENE_5_DURATION = 60;
const SCENE_5_BUBBLE_SETTLE_FRAME = 25;

const Scene5: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const bubbleScale = spring({
		frame: Math.min(frame, SCENE_5_BUBBLE_SETTLE_FRAME),
		fps,
		config: FAST_BOUNCE_SPRING_CONFIG,
	});

	return (
		<AbsoluteFill>
			<SceneBackground />
			<HookText />
			<Bag />
			<Tag />
			<PersonReaching />
			<ThoughtBubble scale={bubbleScale} />
		</AbsoluteFill>
	);
};

// ============================================================================
// ROOT — sequences all scenes together in order
// ============================================================================

export const Short: React.FC = () => {
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<Sequence
				from={0}
				durationInFrames={SCENE_1_DURATION}
				name={`Scene 1 — VO: "${SCENE_1_VO}"`}
			>
				<Scene1 />
			</Sequence>

			<Sequence
				from={SCENE_1_DURATION}
				durationInFrames={SCENE_2_DURATION}
				name={`Scene 2 — VO: "${SCENE_2_VO}"`}
			>
				<Scene2 />
			</Sequence>

			<Sequence
				from={SCENE_1_DURATION + SCENE_2_DURATION}
				durationInFrames={SCENE_3_DURATION}
				name={`Scene 3 — VO: "${SCENE_3_VO}"`}
			>
				<Scene3 />
			</Sequence>

			<Sequence
				from={SCENE_1_DURATION + SCENE_2_DURATION + SCENE_3_DURATION}
				durationInFrames={SCENE_4_DURATION}
				name={`Scene 4 — VO: "${SCENE_4_VO}"`}
			>
				<Scene4 />
			</Sequence>

			<Sequence
				from={SCENE_1_DURATION + SCENE_2_DURATION + SCENE_3_DURATION + SCENE_4_DURATION}
				durationInFrames={SCENE_5_DURATION}
				name={`Scene 5 — VO: "${SCENE_5_VO}"`}
			>
				<Scene5 />
			</Sequence>

			{/* Scene 6 goes here: <Sequence from={SCENE_1_DURATION + SCENE_2_DURATION + SCENE_3_DURATION + SCENE_4_DURATION + SCENE_5_DURATION} durationInFrames={...}> */}
		</AbsoluteFill>
	);
};

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
// Bag's settled position/size, shared across scenes so it never visually
// shifts when a new scene's Sequence takes over.
// ============================================================================

const BACKGROUND_IMAGE = 'images/processed/background.jpeg';
const BAG_CASH_IMAGE = 'images/processed/bag-cash.png';

const BAG_WIDTH = '65%';
const BAG_PADDING_BOTTOM = '20%';

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

// ============================================================================
// SCENE 1 — "What if you randomly found $1,000,000… in cash?"
// Frames 0-120 (0.0s-4.0s @ 30fps)
//
// - background.jpeg fills the frame
// - bag-cash.png is centered, lower-middle of the screen, scaling in with an
//   overshoot bounce (0-45), settling (45-60), then fully static (60-120).
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
const SCENE_1_TEXT = '$1,000,000';
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
			<AbsoluteFill
				style={{
					justifyContent: 'flex-start',
					alignItems: 'center',
					paddingTop: '15%',
				}}
			>
				{textVisible ? (
					<div
						style={{
							transform: `scale(${textScale})`,
							fontFamily: 'Arial, Helvetica, sans-serif',
							fontWeight: 900,
							fontSize: 130,
							color: '#ffffff',
							textAlign: 'center',
							WebkitTextStroke: '10px #000000',
							paintOrder: 'stroke fill',
							textShadow:
								'0 0 30px rgba(34, 197, 94, 0.85), 0 0 70px rgba(34, 197, 94, 0.55)',
						}}
					>
						{SCENE_1_TEXT}
					</div>
				) : null}
			</AbsoluteFill>
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
						transform: `scale(${bagScale})`,
					}}
				/>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 2 — "Like just sitting there."
// Frames 120-180 (4.0s-6.0s @ 30fps)
//
// - Same background, bag remains in its Scene 1 settled position/size.
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
						transform: `scale(${bagScale})`,
					}}
				/>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// ============================================================================
// SCENE 3 — "No name. No note."
// Frames 180-240 (6.0s-8.0s @ 30fps)
//
// - Same background, bag remains in its settled position/size (no text —
//   the Scene 1 text exited at the Scene 1/2 cut and doesn't return).
// - blank-tag.png pops in near the bag's handle/shoulder, small and to the
//   side, as if tied on. Local frames 0-30 (global 6.0s-7.0s): overshoot
//   bounce. Local frames 30-60 (global 7.0s-8.0s): fully static hold.
// ============================================================================

const SCENE_3_VO = 'No name. No note.';
const SCENE_3_DURATION = 60;
const SCENE_3_TAG_SETTLE_FRAME = 30;

const TAG_IMAGE = 'images/processed/blank-tag.png';
const TAG_WIDTH_PX = 220;
// Anchored near the bag's right shoulder/handle-base, just below the handle
// loop (see BAG_WIDTH/BAG_PADDING_BOTTOM geometry). The tag's own loop sits
// at its left edge, so the element is nudged left/up from this anchor
// rather than centered on it.
const TAG_ANCHOR_LEFT = '66%';
const TAG_ANCHOR_TOP = '32%';

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
			<AbsoluteFill
				style={{
					justifyContent: 'flex-end',
					alignItems: 'center',
					paddingBottom: BAG_PADDING_BOTTOM,
				}}
			>
				<Img src={staticFile(BAG_CASH_IMAGE)} style={{width: BAG_WIDTH}} />
			</AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					left: TAG_ANCHOR_LEFT,
					top: TAG_ANCHOR_TOP,
					transform: `translate(-15%, -35%) scale(${tagScale})`,
				}}
			>
				<Img src={staticFile(TAG_IMAGE)} style={{width: TAG_WIDTH_PX, display: 'block'}} />
			</div>
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

			{/* Scene 4 goes here: <Sequence from={SCENE_1_DURATION + SCENE_2_DURATION + SCENE_3_DURATION} durationInFrames={...}> */}
		</AbsoluteFill>
	);
};

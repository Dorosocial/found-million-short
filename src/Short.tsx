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

	return (
		<AbsoluteFill>
			<Img
				src={staticFile('images/processed/background.jpeg')}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
				}}
			/>
			<AbsoluteFill
				style={{
					justifyContent: 'flex-end',
					alignItems: 'center',
					paddingBottom: '20%',
				}}
			>
				<Img
					src={staticFile('images/processed/bag-cash.png')}
					style={{
						width: '65%',
						transform: `scale(${bagScale})`,
					}}
				/>
			</AbsoluteFill>
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

			{/* Scene 2 goes here: <Sequence from={SCENE_1_DURATION} durationInFrames={...}> */}
		</AbsoluteFill>
	);
};

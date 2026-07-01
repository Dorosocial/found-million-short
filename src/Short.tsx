import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

export const Short: React.FC<{title: string}> = ({title}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const scale = spring({
		fps,
		frame,
		config: {damping: 200},
	});

	const opacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#0b0b0f',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					opacity,
					transform: `scale(${scale})`,
					fontSize: 80,
					fontWeight: 'bold',
					color: 'white',
					fontFamily: 'Helvetica, Arial, sans-serif',
					textAlign: 'center',
					padding: '0 60px',
				}}
			>
				{title}
			</div>
		</AbsoluteFill>
	);
};

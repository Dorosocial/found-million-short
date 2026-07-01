import {Composition} from 'remotion';
import {Short} from './Short';

// 1740 frames @ 30fps = 58s, covering all 18 scenes of the video.
export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Short"
				component={Short}
				durationInFrames={1740}
				fps={30}
				width={1080}
				height={1920}
			/>
		</>
	);
};

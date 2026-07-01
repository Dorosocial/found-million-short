import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Assets (images, audio, etc.) live in src/assets and are served via
// staticFile(), e.g. staticFile('images/processed/background.jpeg').
Config.setPublicDir('src/assets');

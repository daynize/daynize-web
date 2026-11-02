import {Config} from '@remotion/cli/config';

// Voice (public/voice) and SFX (public/sfx) live next to this config, not in the repo-root public/.
Config.setPublicDir('public');

// The bundled chrome-headless-shell hangs while loading the root component on this machine;
// the installed Google Chrome renders correctly. Remove this line if the bundled browser works again.
Config.setBrowserExecutable('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

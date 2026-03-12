import { setPaneActive } from "./ui.ts";

const FOCUS_IN = "\x1b[I";
const FOCUS_OUT = "\x1b[O";

/**
 * Create a focus manager for a panel.
 * @param {object} opts
 * @param {boolean} opts.shared - Whether the panel runs in shared (nested tmux) mode
 * @param {() => void} opts.render - Re-render callback
 */
export function createFocusManager({ shared = false, render }) {
	let active = false;
	let hadFocusOut = !shared;
	if (shared) setTimeout(() => { hadFocusOut = true; }, 1000);

	function apply(focus) {
		if (focus === null) return false;
		if (focus === false) hadFocusOut = true;
		if (focus === true && !hadFocusOut) return false;
		active = focus;
		setPaneActive(focus);
		render();
		return true;
	}

	/**
	 * Process a raw input chunk. Extracts focus events, applies the last one,
	 * and returns the remaining non-focus data (or null if fully consumed).
	 */
	function processInput(str) {
		// Fast path: entire chunk is a single focus event
		if (str === FOCUS_IN) { apply(true); return null; }
		if (str === FOCUS_OUT) { apply(false); return null; }

		// Check for focus events mixed with other input
		if (!str.includes(FOCUS_IN) && !str.includes(FOCUS_OUT)) return str;

		let focus = null;
		let remainder = "";
		let i = 0;
		while (i < str.length) {
			if (str.startsWith(FOCUS_IN, i)) {
				focus = true;
				i += FOCUS_IN.length;
			} else if (str.startsWith(FOCUS_OUT, i)) {
				focus = false;
				i += FOCUS_OUT.length;
			} else {
				remainder += str[i];
				i++;
			}
		}
		apply(focus);
		return remainder || null;
	}

	return {
		get active() { return active; },
		processInput,
	};
}

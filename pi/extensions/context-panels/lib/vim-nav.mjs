// Vim-style navigation: j/k, gg/G, Ctrl-d/Ctrl-u, arrows
// createVimNav({ getIdx, setIdx, getLen, render }) → { handleKey, resetPendingG }

export function createVimNav({ getIdx, setIdx, getLen, render }) {
	let pendingG = false;

	function moveUp() { setIdx(Math.max(0, getIdx() - 1)); render(); }
	function moveDown() { setIdx(Math.min(getLen() - 1, getIdx() + 1)); render(); }
	function jumpToTop() { setIdx(0); render(); }
	function jumpToBottom() { setIdx(Math.max(0, getLen() - 1)); render(); }

	function halfPageDown() {
		const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
		setIdx(Math.min(getLen() - 1, getIdx() + jump));
		render();
	}

	function halfPageUp() {
		const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
		setIdx(Math.max(0, getIdx() - jump));
		render();
	}

	// Returns true if the key was handled, false otherwise.
	function handleKey(buf, ch) {
		// Arrows
		if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
			pendingG = false;
			if (buf[2] === 0x41) { moveUp(); return true; }
			if (buf[2] === 0x42) { moveDown(); return true; }
			return false;
		}

		// gg
		if (ch === "g") {
			if (pendingG) { pendingG = false; jumpToTop(); return true; }
			pendingG = true;
			setTimeout(() => { pendingG = false; }, 500);
			return true;
		}

		pendingG = false;

		if (ch === "k") { moveUp(); return true; }
		if (ch === "j") { moveDown(); return true; }
		if (ch === "G") { jumpToBottom(); return true; }
		if (buf.length === 1 && buf[0] === 0x04) { halfPageDown(); return true; }
		if (buf.length === 1 && buf[0] === 0x15) { halfPageUp(); return true; }

		return false;
	}

	return { handleKey, resetPendingG() { pendingG = false; } };
}

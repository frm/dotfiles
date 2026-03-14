export const ENTRY_TYPE = "present-plan";

export interface PlanContext {
	rawStart: number;  // first line in raw markdown (1-indexed)
	rawEnd: number;    // last line in raw markdown (1-indexed)
	content: string;   // markdown to render in context-aware editor
}

export interface PlanOverlayResult {
	approved: boolean;
	feedback?: string;
}

export interface OverlayExitState {
	action: "approve" | "submit" | "reject" | "feedback" | "comment";
	cursorLine: number;
	scrollOffset: number;
}

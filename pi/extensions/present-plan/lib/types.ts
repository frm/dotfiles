export const ENTRY_TYPE = "present-plan";

export interface PlanOverlayResult {
	approved: boolean;
	feedback?: string;
}

export interface OverlayExitState {
	action: "approve" | "submit" | "reject" | "feedback" | "comment";
	cursorLine: number;
	scrollOffset: number;
}

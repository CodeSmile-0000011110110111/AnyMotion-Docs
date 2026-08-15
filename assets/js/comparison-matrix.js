/*
 * Click-to-open detail bubbles for the comparison matrix page
 * (animate-yourself-vs-animator.md).
 *
 * Progressive enhancement, in two deliberate parts:
 *
 * 1. In the HTML, every info bubble is an ordinary link pointing at the matching entry in the
 *    legend below the table. With this script absent, JavaScript disabled, or a browser without
 *    the Popover API, clicking one jumps to that legend entry. Nothing becomes unreachable.
 *
 * 2. With this script running, the same click opens a bubble instead. The bubble's text is read
 *    out of the legend entry at click time rather than duplicated in the markup, so the bubble
 *    and the legend cannot disagree with each other.
 *
 * Opening is click-driven, never hover-driven: a hover-only tooltip cannot be opened on a touch
 * device at all.
 *
 * The bubble is a top-layer popover, which is what keeps it from being clipped by the table's own
 * horizontal scroll container. It is declared popover="manual" rather than popover="auto", so the
 * browser's own light-dismiss behaviour does not apply and this file closes it instead: Escape, a
 * pointer press outside it, and the close button. An auto popover light-dismisses on the pointerup
 * of any press whose target is not in its ancestor chain, and a plain link cannot be in that chain
 * (only a button or an input can be a popover invoker) — so with auto, every press on a trigger
 * closed the bubble before the click event was dispatched, which turned a second press on the same
 * trigger into a reopen and a press on another trigger into a close followed by a reopen.
 */
(function () {
	"use strict";

	var bubble = document.getElementById("matrix-tip");
	var links = document.querySelectorAll("a.tip");

	// No bubble element, no triggers, or no Popover API: leave the links as links.
	if (!bubble || !links.length || typeof bubble.showPopover !== "function") { return; }

	var title = document.getElementById("matrix-tip-title");
	var body = document.getElementById("matrix-tip-body");
	var close = document.getElementById("matrix-tip-close");
	var current = null;
	var closedByOutsidePress = false;
	var GAP = 6;
	var EDGE = 8;

	function isOpen() {
		return bubble.matches(":popover-open");
	}

	function triggerOf(node) {
		return node && typeof node.closest === "function" ? node.closest("a.tip") : null;
	}

	/* Fill the bubble from the legend entry the link points at. The <dt> supplies the heading and
	   the <dd> immediately after it supplies the text. */
	function fill(link) {
		var id = (link.getAttribute("href") || "").replace(/^#/, "");
		var term = id ? document.getElementById(id) : null;
		var detail = term ? term.nextElementSibling : null;

		if (!term || !detail || detail.tagName !== "DD") { return false; }

		title.textContent = term.textContent.trim();
		body.innerHTML = detail.innerHTML;
		return true;
	}

	/* Place the bubble under its own trigger, or above it when there is not enough room below, then
	   clamp it into the viewport on both axes. The final clamp is not redundant: the trigger can be
	   scrolled off the top of the screen while the bubble is open, and without it the bubble would
	   follow the trigger out of sight. The bubble's own max-height keeps that clamp satisfiable. */
	function position(link) {
		var anchor = link.getBoundingClientRect();
		var size = bubble.getBoundingClientRect();
		var left = anchor.left + (anchor.width / 2) - (size.width / 2);
		var top = anchor.bottom + GAP;

		if (top + size.height > window.innerHeight - EDGE) {
			var above = anchor.top - size.height - GAP;

			if (above >= EDGE) { top = above; }
		}

		left = Math.max(EDGE, Math.min(left, window.innerWidth - size.width - EDGE));
		top = Math.max(EDGE, Math.min(top, window.innerHeight - size.height - EDGE));

		bubble.style.left = Math.round(left) + "px";
		bubble.style.top = Math.round(top) + "px";
	}

	/* One trigger at a time reports itself as expanded. Rewriting all of them from the one piece of
	   state, rather than editing the outgoing and incoming trigger separately, keeps this correct
	   however the bubble was closed. */
	function syncExpandedState() {
		var open = isOpen();

		for (var n = 0; n < links.length; n++) {
			links[n].setAttribute("aria-expanded", open && links[n] === current ? "true" : "false");
		}
	}

	/* Switching from one trigger to another refills the bubble in place. Closing and reopening it
	   instead would queue a close event and an open event whose handlers then run after this
	   function has already moved `current` on, and the close handler would clear the state the open
	   handler had just set.

	   Focus moves into the bubble, because the click handler suppresses the link's own jump to the
	   legend entry: without this a keyboard or screen-reader user is told the bubble is expanded and
	   given no way to reach the text it holds. */
	function open(link) {
		if (!fill(link)) { return false; }

		current = link;

		if (!isOpen()) { bubble.showPopover(); }

		position(link);
		syncExpandedState();
		bubble.focus({ preventScroll: true });
		return true;
	}

	function hide() {
		if (isOpen()) { bubble.hidePopover(); }
	}

	function reposition() {
		if (isOpen() && current) { position(current); }
	}

	/* Both attributes are set here rather than in the markup, so a trigger only describes itself as a
	   disclosure control while the script that makes it one is running. Without the script it stays
	   an ordinary link to the legend entry, which is what it behaves as. */
	for (var i = 0; i < links.length; i++) {
		links[i].setAttribute("aria-controls", "matrix-tip");
		links[i].setAttribute("aria-expanded", "false");

		/* Reading the bubble's state here is only correct because nothing can close it between the
		   press and this event: a manual popover performs no light dismiss of its own, and the
		   outside-press rule below returns early for a press on any trigger.

		   The link's own jump is suppressed only once there is a bubble to show instead. A legend
		   entry that does not resolve — a renamed or mistyped id — therefore leaves the trigger
		   working as the plain link it started as, rather than doing nothing at all. */
		links[i].addEventListener("click", function (event) {
			if (isOpen() && current === this) {
				event.preventDefault();
				hide();
				return;
			}

			if (open(this)) { event.preventDefault(); }
		});
	}

	if (close) {
		close.addEventListener("click", function () { hide(); });
	}

	/* The two dismissals a manual popover does not perform for itself. A press on a trigger is
	   excluded so that switching triggers stays an in-place refill rather than a close and reopen. */
	document.addEventListener("pointerdown", function (event) {
		if (!isOpen() || bubble.contains(event.target) || triggerOf(event.target)) { return; }

		closedByOutsidePress = true;
		hide();
	});

	document.addEventListener("keydown", function (event) {
		if (!isOpen() || (event.key !== "Escape" && event.key !== "Esc")) { return; }

		event.preventDefault();
		hide();
	});

	/* Covers every way the bubble can close, so no trigger reports an open bubble that is not there.
	   Focus goes back to the trigger it was opened from, but only when the close left it with
	   nowhere to be — a close caused by pressing something else must not take focus away from it. */
	bubble.addEventListener("toggle", function (event) {
		if (event.newState !== "closed") { return; }

		var trigger = current;
		var active = document.activeElement;
		var fromOutsidePress = closedByOutsidePress;

		current = null;
		closedByOutsidePress = false;
		syncExpandedState();

		if (fromOutsidePress) { return; }

		if (trigger && (!active || active === document.body || bubble.contains(active))) {
			trigger.focus();
		}
	});

	// `true` so this also fires for the table wrapper's own horizontal scrolling, not just the page.
	window.addEventListener("scroll", reposition, true);
	window.addEventListener("resize", reposition);
}());

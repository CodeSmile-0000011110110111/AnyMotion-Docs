/*
 * Click-to-open detail bubbles for the comparison matrix page
 * (animate-yourself-vs-animator.md).
 *
 * Every Animate Yourself and Animator cell holds one symbol button rather than a full sentence.
 * Each button carries a `data-detail` attribute naming a `<template>` element that sits right
 * after that row in the table body - one template per row, holding an "Animate Yourself" section,
 * an "Animator" section and (for a row that used to have a legend entry) an "Additional detail"
 * section, so the two buttons in one row point at the same template and open the same content.
 * The bubble's body is a clone of that template's content, read at click time rather than
 * duplicated in a second place, so the bubble and the table cannot disagree with each other.
 *
 * This page used to have a no-JavaScript fallback: the trigger was a link to a matching entry in
 * a legend below the table, so clicking it without this script still reached the text. That
 * legend is gone - its content now lives only in the templates above - so a plain <button> with
 * this script absent, or in a browser without the Popover API, does nothing when activated. That
 * is an accepted trade-off, not an oversight: a compact symbol has nowhere else to send a reader
 * for the detail behind it. Using a <button> instead of the previous <a> does gain one thing back:
 * the Space key opens it, not only Enter, because a form control responds to both by default and
 * a plain link never responded to Space.
 *
 * Opening is click-driven, never hover-driven: a hover-only tooltip cannot be opened on a touch
 * device at all.
 *
 * The bubble is a top-layer popover, which is what keeps it from being clipped by the table's own
 * horizontal scroll container. It is declared popover="manual" rather than popover="auto", so the
 * browser's own light-dismiss behaviour does not apply and this file closes it instead: Escape, a
 * pointer press outside it, and the close button. An auto popover light-dismisses on the pointerup
 * of any press whose target is not in its ancestor chain, and only a button or an input can be in
 * that chain as a popover invoker - so with auto, every press on a trigger closed the bubble
 * before the click event was dispatched, which turned a second press on the same trigger into a
 * reopen and a press on another trigger into a close followed by a reopen. Measured directly in
 * Chrome with trusted pointer events before this file settled on manual.
 */
(function () {
	"use strict";

	var bubble = document.getElementById("matrix-tip");
	var triggers = document.querySelectorAll("button.tip");

	// No bubble element, no triggers, or no Popover API: the buttons stay inert.
	if (!bubble || !triggers.length || typeof bubble.showPopover !== "function") { return; }

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
		return node && typeof node.closest === "function" ? node.closest("button.tip") : null;
	}

	/* Fill the bubble from the <template> the button names, and title it with the row's own first
	   cell - the problem label both of a row's buttons share, so the same title applies whichever
	   one was pressed. */
	function fill(trigger) {
		var id = trigger.getAttribute("data-detail");
		var template = id ? document.getElementById(id) : null;

		if (!template || template.tagName !== "TEMPLATE") { return false; }

		var row = trigger.closest("tr");
		var labelCell = row ? row.querySelector("td:first-child") : null;

		title.textContent = labelCell ? labelCell.textContent.trim() : "";
		body.innerHTML = "";
		body.appendChild(template.content.cloneNode(true));
		return true;
	}

	/* Place the bubble under its own trigger, or above it when there is not enough room below, then
	   clamp it into the viewport on both axes. The final clamp is not redundant: the trigger can be
	   scrolled off the top of the screen while the bubble is open, and without it the bubble would
	   follow the trigger out of sight. The bubble's own max-height keeps that clamp satisfiable. */
	function position(trigger) {
		var anchor = trigger.getBoundingClientRect();
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

		for (var n = 0; n < triggers.length; n++) {
			triggers[n].setAttribute("aria-expanded", open && triggers[n] === current ? "true" : "false");
		}
	}

	/* Switching from one trigger to another refills the bubble in place. Closing and reopening it
	   instead would queue a close event and an open event whose handlers then run after this
	   function has already moved `current` on, and the close handler would clear the state the open
	   handler had just set.

	   Focus moves into the bubble, because the click handler suppresses the button's own default
	   action: without this a keyboard or screen-reader user is told the bubble is expanded and
	   given no way to reach the text it holds. */
	function open(trigger) {
		if (!fill(trigger)) { return false; }

		current = trigger;

		if (!isOpen()) { bubble.showPopover(); }

		position(trigger);
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
	   disclosure control while the script that makes it one is running. */
	for (var i = 0; i < triggers.length; i++) {
		triggers[i].setAttribute("aria-controls", "matrix-tip");
		triggers[i].setAttribute("aria-expanded", "false");

		/* Reading the bubble's state here is only correct because nothing can close it between the
		   press and this event: a manual popover performs no light dismiss of its own, and the
		   outside-press rule below returns early for a press on any trigger. */
		triggers[i].addEventListener("click", function (event) {
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
	   nowhere to be - a close caused by pressing something else must not take focus away from it. */
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

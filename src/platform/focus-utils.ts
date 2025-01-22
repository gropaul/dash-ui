export function setCursorPosition(element: HTMLElement, position: number): void {

    console.log("setCursorPosition", element, position);

    const selection = window.getSelection();
    if (!selection) return; // No selection available

    // Ensure the element has child nodes
    if (element.childNodes.length === 0) {
        // Optionally, create an empty text node if needed
        // element.appendChild(document.createTextNode(""));
        return;
    }

    // Typically we care about the first child being a text node
    const firstChild = element.childNodes[0];

    // Make sure it's actually a text node
    if (firstChild.nodeType !== Node.TEXT_NODE) {
        // Optionally, replace or wrap with a text node if desired
        // element.replaceChild(document.createTextNode(firstChild.textContent || ""), firstChild);
        return;
    }

    const textNode = firstChild;
    const textLength = textNode.nodeValue?.length ?? 0;

    // Clamp the position so it's never out-of-bounds
    const clampedPosition = Math.min(position, textLength);

    // Create and set up the range
    const range = document.createRange();
    range.setStart(textNode, clampedPosition);
    range.collapse(true);

    // Clear any existing selections
    selection.removeAllRanges();
    selection.addRange(range);
}

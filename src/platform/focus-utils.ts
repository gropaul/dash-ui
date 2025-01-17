export function setCursorPosition(element: HTMLElement, position: number): void {
    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) return;

    // Ensure the element has child nodes
    if (element.childNodes.length > 0) {
        let currentNode: ChildNode | null = element.firstChild;
        let currentPosition = 0;

        // Traverse child nodes to locate the correct text node
        while (currentNode && currentPosition + (currentNode.textContent?.length || 0) < position) {
            currentPosition += currentNode.textContent?.length || 0;
            currentNode = currentNode.nextSibling;
        }

        if (currentNode) {
            const offset = position - currentPosition;
            range.setStart(currentNode, offset);
            range.collapse(true);

            selection.removeAllRanges();
            selection.addRange(range);
            element.focus();
        }
    }
}

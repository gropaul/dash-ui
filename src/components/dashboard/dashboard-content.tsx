import {useState, useRef, useEffect} from "react";
import {DashboardElementView} from "@/components/dashboard/dashboard-element-view";
import {DashboardElementDivider} from "@/components/dashboard/dashboard-element-divider";
import {DashboardElementType, DashboardState, getInitialElement} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";
import {useHotkeys} from "react-hotkeys-hook";
import {useStandardShortcuts} from "@/hooks/use-standard-shortcuts";

interface DashboardContentProps {
    dashboard: DashboardState;
}

export interface FocusState {
    elementId: string | null;
    cursorLocation?: "start" | "end"; // Where the text cursor should be placed
}

export function DashboardContent(props: DashboardContentProps) {

    const dashboard = props.dashboard;
    const updateDashboardSelection = useRelationsState((state) => state.updateDashboardSelection);
    const deleteDashboardElements = useRelationsState((state) => state.deleteDashboardElements);

    const [focusState, setFocusState] = useState<FocusState>({
        elementId: null,
        cursorLocation: "end"
    });

    useStandardShortcuts({
        onEscape: () => {
            setFocusState({elementId: null});
            updateDashboardSelection(dashboard.id, [], "replace");
            console.log("Escape");
        },
        onDelete: () => {
            // Delete selected elements
            const selectedElements = dashboard.selectedElements;
            if (selectedElements.length > 0) {
                deleteDashboardElements(dashboard.id, selectedElements);
            }
            console.log("Delete");

        }
    });

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            updateDashboardSelection(dashboard.id, [], "replace");
        };
        // Attach the global pointer down event listener
        document.addEventListener("pointerdown", handlePointerDown);
        // Clean up the event listener on unmount
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, []);

    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState({top: 0, left: 0, width: 0, height: 0});
    const containerRef = useRef<HTMLDivElement>(null);

    const startPoint = useRef({x: 0, y: 0});
    const lastUpdateTime = useRef<number>(0);

    function updateSelection() {
        const container = containerRef.current;
        if (container) {
            const allParentElements = Array.from(container.children);
            // find the root element
            const rootElement = allParentElements.find((el) => el.getAttribute("data-element-id") === "root");

            if (!rootElement) return;

            const allElements = Array.from(rootElement.children);

            const selectedElements = allElements.filter((el) => {
                const rect = el.getBoundingClientRect();
                const box = container.getBoundingClientRect();
                const selection = {
                    top: box.top + selectionBox.top,
                    left: box.left + selectionBox.left,
                    right: box.left + selectionBox.left + selectionBox.width,
                    bottom: box.top + selectionBox.top + selectionBox.height,
                };

                return (
                    rect.left < selection.right &&
                    rect.right > selection.left &&
                    rect.top < selection.bottom &&
                    rect.bottom > selection.top
                );
            });

            const selectedIds = selectedElements.map((el) => el.getAttribute("data-element-id"));
            updateDashboardSelection(dashboard.id, selectedIds as string[], "replace");
        }
    }

    function onBasePointerDown(e: React.PointerEvent) {

        if (e.button !== 0) return; // Only handle left mouse button

        const container = containerRef.current?.getBoundingClientRect();
        const rootElement = containerRef.current?.querySelector('[data-element-id="root"]')?.getBoundingClientRect();

        if (rootElement && container) {

            const clickInsideRoot = (
                e.clientX >= rootElement.left &&
                e.clientX <= rootElement.right &&
                e.clientY >= rootElement.top &&
                e.clientY <= rootElement.bottom
            );

            if (clickInsideRoot) {
                return; // Do nothing if the click is inside the root element
            }


            setIsSelecting(true);
            setFocusState({elementId: null});

            e.preventDefault(); // Prevent default to avoid unwanted behavior

            startPoint.current = {x: e.clientX - container.left, y: e.clientY - container.top};
            setSelectionBox({
                top: startPoint.current.y,
                left: startPoint.current.x,
                width: 0,
                height: 0,
            });
        }
    }

    function onBasePointerMove(e: React.PointerEvent) {
        if (!isSelecting) return;
        e.preventDefault(); // Prevent default during selection

        const container = containerRef.current?.getBoundingClientRect();
        if (container) {
            const currentPoint = {
                x: e.clientX - container.left,
                y: e.clientY - container.top,
            };

            setSelectionBox({
                top: Math.min(startPoint.current.y, currentPoint.y),
                left: Math.min(startPoint.current.x, currentPoint.x),
                width: Math.abs(currentPoint.x - startPoint.current.x),
                height: Math.abs(currentPoint.y - startPoint.current.y),
            });

            const currentTime = Date.now();
            if (currentTime - lastUpdateTime.current > 100) {
                updateSelection();
                lastUpdateTime.current = currentTime;
            }
        }
    }

    function onBasePointerUp() {
        if (isSelecting) {
            updateSelection(); // Final update on pointer up
            setIsSelecting(false);
            setSelectionBox({top: 0, left: 0, width: 0, height: 0});
        }
    }

    return (
            <div
                className="p-4 pl-1 overflow-auto w-full h-full"
                ref={containerRef}
                onPointerDown={onBasePointerDown}
                onPointerMove={onBasePointerMove}
                onPointerUp={onBasePointerUp}
            >
                <div className="max-w-screen-md mx-auto flex space-y-2 flex-col mb-[1024px] relative"
                     data-element-id="root"
                >
                    {Object.values(dashboard.elementsOrder).map((elementId, index) => (
                        <div
                            key={index}
                            data-element-id={elementId}
                        >
                            <DashboardElementView
                                focusState={focusState}
                                setFocusState={setFocusState}
                                dashboardId={dashboard.id}
                                selected={dashboard.selectedElements.includes(elementId)}
                                dashboardElement={dashboard.elements[elementId]}
                                elementsOrder={dashboard.elementsOrder}
                                elementIndex={index}
                                elementsCount={dashboard.elementsOrder.length}
                            />
                        </div>
                    ))}
                </div>

                {isSelecting && (
                    <div
                        className="absolute bg-blue-200 opacity-50 border border-blue-500"
                        style={{
                            top: selectionBox.top,
                            left: selectionBox.left,
                            width: selectionBox.width,
                            height: selectionBox.height,
                        }}
                    />
                )}
            </div>
    );
}

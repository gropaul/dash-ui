'use client'
import Draggable from 'react-draggable';

export default function Page() {
    return (
        <Draggable>
            <div>I can be dragged around!</div>
        </Draggable>
    );
}
import { useEffect, useRef } from 'react';

// Global stack to handle multiple modals
// The last element is considered the "topmost"
const handlerStack: (() => void)[] = [];

// Global listener to dispatch events to the top handler
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const topHandler = handlerStack[handlerStack.length - 1];
            if (topHandler) {
                // Prevent default only if a handler exists and is executed
                // e.preventDefault(); 
                topHandler();
            }
        }
    });
}

/**
 * Hook to handle Escape key press.
 * Registers the handler in a global stack to ensure only the topmost modal closes.
 * @param handler Function to call when Escape is pressed
 * @param isActive Whether the listener should be active (default true)
 */
export default function useEscapeKey(handler: () => void, isActive: boolean = true) {
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!isActive) return;

        const listener = () => savedHandler.current();
        handlerStack.push(listener);

        return () => {
            const index = handlerStack.indexOf(listener);
            if (index > -1) {
                handlerStack.splice(index, 1);
            }
        };
    }, [isActive]);
}

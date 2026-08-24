(function() {
    'use strict';

    // Make absolutely positioned elements draggable
    function makeDraggable(panelId, handleSelector) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        
        const handle = panel.querySelector(handleSelector) || panel;
        handle.style.cursor = 'move';
        
        let isDragging = false;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Reset offsets when panel is hidden/shown to prevent it flying off screen
        // In this implementation, we just rely on the bounds check during drag

        handle.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);

        function dragStart(e) {
            // Ignore button clicks in the header (like the close button)
            if (e.target.closest('button')) return;

            // Get initial cursor position minus any existing translation offset
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === handle || handle.contains(e.target)) {
                isDragging = true;
            }
        }

        function dragEnd(e) {
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                // Calculate new offsets
                let currentX = e.clientX - initialX;
                let currentY = e.clientY - initialY;
                
                // Keep the panel somewhat within the screen bounds
                // (Very basic bounding check to prevent completely losing the panel)
                const rect = panel.getBoundingClientRect();
                // Avoid doing complex bounds math here for simplicity, just apply translate
                
                xOffset = currentX;
                yOffset = currentY;
                
                panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }
    }

    // Initialize resizers
    function initResizers() {
        const vResizer = document.getElementById('vertical-resizer');
        const sidebar = document.getElementById('sidebar');
        
        if (vResizer && sidebar) {
            let isResizing = false;
            vResizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                document.body.style.cursor = 'col-resize';
                // Prevent selection while resizing
                document.body.style.userSelect = 'none';
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                // Calculate new width: viewport width - mouse X
                const newWidth = document.body.clientWidth - e.clientX;
                // Bound the width between 200px and 800px
                if (newWidth > 200 && newWidth < 800) {
                    sidebar.style.width = `${newWidth}px`;
                    sidebar.style.flexBasis = `${newWidth}px`; // Handle Tailwind shrink/basis 
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = 'auto';
                    // Trigger Cytoscape resize to redraw the graph
                    if (window.CyberEngine && window.CyberEngine.Graph && window.CyberEngine.Graph.cy) {
                        window.CyberEngine.Graph.cy.resize();
                    }
                }
            });
        }

        const hResizer = document.getElementById('horizontal-resizer');
        const timeline = document.getElementById('timeline-container');
        
        if (hResizer && timeline) {
            let isHResizing = false;
            hResizer.addEventListener('mousedown', (e) => {
                isHResizing = true;
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isHResizing) return;
                // Calculate new height: viewport height - mouse Y
                const newHeight = document.body.clientHeight - e.clientY;
                // Bound the height between 50px and 400px
                if (newHeight > 50 && newHeight < 400) {
                    timeline.style.height = `${newHeight}px`;
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isHResizing) {
                    isHResizing = false;
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = 'auto';
                    // Trigger Cytoscape resize to redraw the graph just in case vertical space changed
                    if (window.CyberEngine && window.CyberEngine.Graph && window.CyberEngine.Graph.cy) {
                        window.CyberEngine.Graph.cy.resize();
                    }
                }
            });
        }
    }

    // Initialize when DOM is ready
    window.addEventListener('DOMContentLoaded', () => {
        makeDraggable('device-panel', '.panel-header');
        makeDraggable('user-detail', '.panel-header');
        initResizers();
    });

})();

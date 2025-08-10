/**
 * Universal Navigation Active State Manager
 * Automatically sets the active state for navigation buttons based on current page
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        setActiveNavigationState();
    });
    
    function setActiveNavigationState() {
        // Get current page filename
        const currentPage = getCurrentPageName();
        
        // Remove all existing active states
        removeAllActiveStates();
        
        // Set active state for current page
        setActiveStateForPage(currentPage);
    }
    
    function getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // Handle root path
        if (filename === '' || filename === '/') {
            return 'index.html';
        }
        
        return filename;
    }
    
    function removeAllActiveStates() {
        // Remove active classes from all navigation buttons
        const activeButtons = document.querySelectorAll('.nav-btn-active');
        activeButtons.forEach(button => {
            button.classList.remove('nav-btn-active');
        });
        
        // Also remove from compact navigation buttons
        const compactActiveButtons = document.querySelectorAll('.nav-btn-compact.nav-btn-active');
        compactActiveButtons.forEach(button => {
            button.classList.remove('nav-btn-active');
        });
    }
    
    function setActiveStateForPage(currentPage) {
        let targetSelector = '';
        
        // Map pages to their navigation selectors
        switch (currentPage) {
            case 'index.html':
                targetSelector = 'a[href="index.html"], a[href="./index.html"], a[href="/index.html"]';
                break;
            case 'closing-ranks.html':
                targetSelector = 'a[href="closing-ranks.html"], a[href="./closing-ranks.html"], a[href="/closing-ranks.html"]';
                break;
            case 'phase2-cutoffs.html':
                targetSelector = 'a[href="phase2-cutoffs.html"], a[href="./phase2-cutoffs.html"], a[href="/phase2-cutoffs.html"]';
                break;
            case 'previous-year-cutoffs.html':
                targetSelector = 'a[href="previous-year-cutoffs.html"], a[href="./previous-year-cutoffs.html"], a[href="/previous-year-cutoffs.html"]';
                break;

            default:
                // Default to index if page not recognized
                targetSelector = 'a[href="index.html"], a[href="./index.html"], a[href="/index.html"]';
                break;
        }
        
        // Find and activate the target navigation button
        const targetButtons = document.querySelectorAll(targetSelector);
        targetButtons.forEach(button => {
            // Check if it's a compact navigation button or regular navigation button
            if (button.classList.contains('nav-btn-compact')) {
                button.classList.add('nav-btn-active');
            } else if (button.classList.contains('nav-btn') || button.classList.contains('nav-btn-cutoff')) {
                button.classList.add('nav-btn-active');
            } else {
                // For other navigation styles, add the active class
                button.classList.add('nav-btn-active');
            }
        });
        
        console.log(`🎯 Navigation active state set for: ${currentPage}`);
    }
    
    // Export for manual triggering if needed
    window.setNavigationActiveState = setActiveNavigationState;
})();

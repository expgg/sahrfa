/*
* ======================================
* NEW FILE: blocker.js
* This file attempts to block DevTools.
*
* ⚠️ WARNING: THIS IS NOT REAL SECURITY.
* This only blocks basic keyboard shortcuts and right-clicking.
* Anyone can still see your 'auth.js' file by:
* 1. Typing 'view-source:' before your URL.
* 2. Disabling JavaScript.
* 3. Using 'curl' or another tool to download the page.
*
* The ONLY secure way to store passwords is on a server.
* ======================================
*/

(function() {
    // 1. Block right-click (context menu)
    // This also blocks long-press on most mobile browsers.
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Block keyboard shortcuts for DevTools
    document.addEventListener('keydown', (e) => {
        // Block F12
        if (e.key === 'F12') {
            e.preventDefault();
            return;
        }
        
        // Block Ctrl+Shift+I (Windows/Linux)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return;
        }

        // Block Ctrl+Shift+J (Windows/Linux)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return;
        }

        // Block Ctrl+Shift+C (Windows/Linux)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return;
        }

        // Block Cmd+Option+I (Mac)
        if (e.metaKey && e.altKey && e.key === 'i') {
            e.preventDefault();
            return;
        }

        // Block Cmd+Option+J (Mac)
        if (e.metaKey && e.altKey && e.key === 'j') {
            e.preventDefault();
            return;
        }

        // Block Cmd+Option+C (Mac)
        if (e.metaKey && e.altKey && e.key === 'c') {
            e.preventDefault();
            return;
        }

        // Block Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'U') {
            e.preventDefault();
            return;
        }

        // Block Cmd+U (View Source - Mac)
        if (e.metaKey && e.key === 'u') {
            e.preventDefault();
            return;
        }
    });
})();
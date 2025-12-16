/*
* ======================================
* NEW FILE: video-page.js
* This file handles the auth check on
* em.html, mm.html, and sm.html.
* ======================================
*/

import { checkAuth, promptForPassword, redirectToHome } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Get the uncle ID from the <body> tag
    const unc = document.body.dataset.unc;

    // Get the page elements
    const loader = document.getElementById('pageLoader');
    const pageContent = document.getElementById('pageContent');
    const pageNav = document.getElementById('pageNav');

    if (!unc) {
        // If the data-unc attribute is missing, something is wrong.
        console.error('No data-unc attribute found on body. Auth failed.');
        redirectToHome();
        return;
    }

    /**
     * Shows the page content and hides the loader.
     */
    const showPage = () => {
        loader.style.display = 'none';
        pageContent.style.display = 'block';
        pageNav.style.display = 'block';
    };

    // --- Auth Check ---
    if (checkAuth(unc)) {
        // 1. User is already authenticated
        showPage();
    } else {
        // 2. User is NOT authenticated
        // Prompt for password.
        // On success, show the page.
        // On fail (cancel), redirect to home.
        promptForPassword(unc, showPage, redirectToHome);
    }
});
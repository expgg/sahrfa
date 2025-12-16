/*
* ======================================
* NEW FILE: main.js
* This file handles all click logic on index.html.
* ======================================
*/

import { checkAuth, promptForPassword } from './auth.js';
import { openDownloadModal } from './download-modal.js';

document.addEventListener('DOMContentLoaded', () => {

    const thumbnailLinks = document.querySelectorAll('.card-thumbnail-link');
    const downloadButtons = document.querySelectorAll('.download-btn');

    // --- 1. Handle Thumbnail Clicks (to view videos) ---
    thumbnailLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the link from navigating
            
            const unc = link.dataset.unc;
            const targetUrl = `${unc}.html`;

            // Check if already authenticated
            if (checkAuth(unc)) {
                window.location.href = targetUrl;
            } else {
                // Not authed, so prompt for password.
                // On success, navigate. On fail, do nothing.
                promptForPassword(
                    unc,
                    () => { window.location.href = targetUrl; },
                    () => { /* User cancelled, do nothing */ }
                );
            }
        });
    });

    // --- 2. Handle Download Button Clicks ---
    downloadButtons.forEach(button => {
        button.addEventListener('click', () => {
            const unc = button.dataset.unc;
            const title = button.dataset.title;

            // Check if already authenticated
            if (checkAuth(unc)) {
                openDownloadModal(unc, title);
            } else {
                // Not authed, so prompt for password.
                // On success, open the modal. On fail, do nothing.
                promptForPassword(
                    unc,
                    () => { openDownloadModal(unc, title); },
                    () => { /* User cancelled, do nothing */ }
                );
            }
        });
    });

});
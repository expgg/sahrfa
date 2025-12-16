/*
* ======================================
* UPDATED FILE: download-modal.js
* Refactored to export its main function.
* ======================================
*/

// --- Get all the DOM elements ---
const modalBackdrop = document.getElementById('modalBackdrop');
const modal = document.getElementById('downloadModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTitle = document.getElementById('modalTitle');
const modalList = document.getElementById('modalList');

// --- Google Drive Download URL Base ---
const gdriveDownloadBase = 'https://drive.google.com/uc?export=download&id=';

/**
 * Fetches and parses the video list from an uncle's HTML page.
 * @param {string} unc - The uncle identifier (e.g., 'em').
 * @returns {Promise<Array>} - A promise that resolves to an array of link objects.
 */
const fetchVideoList = async (unc) => {
    const url = `${unc}.html`; // e.g., "em.html"
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const htmlText = await response.text();

    // Use DOMParser to turn the text into a searchable HTML document
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Find all video items *within the page content*
    // This is important because the page now contains a password modal
    const videoItems = doc.querySelectorAll('#pageContent .video-item');
    const downloadLinks = [];

    videoItems.forEach(item => {
        const title = item.querySelector('.video-title')?.textContent;
        const container = item.querySelector('.video-container');
        const gdriveId = container?.dataset.gdriveId;

        if (title && gdriveId && gdriveId !== '#') {
            downloadLinks.push({
                title: title,
                url: `${gdriveDownloadBase}${gdriveId}`
            });
        }
    });

    return downloadLinks;
};

/**
 * Function to close the modal
 */
const closeDownloadModal = () => {
    modalBackdrop.classList.remove('show');
};

/**
 * Function to open the download modal
 * This is now EXPORTED to be used by main.js
 * @param {string} unc - The uncle identifier.
 * @param {string} title - The uncle's name for the modal title.
 */
export const openDownloadModal = (unc, title) => {
    modalTitle.textContent = `Download: ${title}`;
    modalList.innerHTML = '<p>Loading video list...</p>';
    modalBackdrop.classList.add('show');
    
    // Fetch the video list
    fetchVideoList(unc)
        .then(links => {
            if (links.length > 0) {
                modalList.innerHTML = links.map(link => `
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="download-link">
                        <span>${link.title}</span>
                    </a>
                `).join('');
            } else {
                modalList.innerHTML = '<p>No Google Drive links found for this uncle.</p>';
            }
        })
        .catch(err => {
            console.error('Error fetching video list:', err);
            modalList.innerHTML = '<p>Could not load video list.</p>';
        });
};

// --- Attach close listeners ---
// These are still handled here.
modalCloseBtn.addEventListener('click', closeDownloadModal);
modalBackdrop.addEventListener('click', closeDownloadModal);
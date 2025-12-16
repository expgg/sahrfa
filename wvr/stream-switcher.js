/*
* ======================================
* UPDATED FILE: stream-switcher.js
* Fixed the template literal bug.
* ======================================
*/

document.addEventListener('DOMContentLoaded', () => {
    const switchStreamBtn = document.getElementById('switchStreamBtn');
    const streamMenu = document.getElementById('streamMenu');
    const menuBackdrop = document.getElementById('menuBackdrop');
    const streamOptions = document.querySelectorAll('.stream-option');
    const videoContainers = document.querySelectorAll('.video-container');

    // --- Base URLs for embeds ---
    const embedBaseUrls = {
        mega: 'https://mega.nz/embed/',
        youtube: 'https://www.youtube.com/embed/',
        gdrive: 'https://drive.google.com/file/d/' // Assuming /preview at the end
    };

    // --- 1. Menu Toggle Logic ---
    const toggleMenu = (show) => {
        if (show) {
            streamMenu.classList.add('show');
            menuBackdrop.classList.add('show');
        } else {
            streamMenu.classList.remove('show');
            menuBackdrop.classList.remove('show');
        }
    };

    if (switchStreamBtn) {
        switchStreamBtn.addEventListener('click', () => toggleMenu(true));
    }
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', () => toggleMenu(false));
    }

    // --- 2. Stream Switching Logic ---
    streamOptions.forEach(option => {
        option.addEventListener('click', () => {
            const provider = option.dataset.provider;
            setStreamProvider(provider);
            toggleMenu(false);
        });
    });

    const setStreamProvider = (provider) => {
        // Save the choice to the browser's memory
        localStorage.setItem('preferredStream', provider);
        // Update all videos on the page
        updateAllVideos(provider);
    };

    const updateAllVideos = (provider) => {
        videoContainers.forEach(container => {
            const iframe = container.querySelector('iframe');
            // Get the ID from the data attribute, e.g., "data-youtube-id"
            const id = container.dataset[provider + 'Id'];

            if (!iframe) return; // Skip if no iframe

            if (id && id !== '#') {
                let embedUrl = '';
                if (provider === 'gdrive') {
                    // GDrive needs a /preview suffix
                    embedUrl = `${embedBaseUrls.gdrive}${id}/preview`;
                } else {
                    // **FIXED**: Added ${} around 'id'
                    embedUrl = `${embedBaseUrls[provider]}${id}`;
                }
                iframe.src = embedUrl;
            } else {
                // If ID is missing or is '#', show a blank page
                iframe.src = 'about:blank';
            }
        });
    };

    // --- 3. On Page Load Logic ---
    // Get the saved provider, or default to 'youtube'
    const savedProvider = localStorage.getItem('preferredStream') || 'youtube';
    // Load the correct videos the moment the page opens
    updateAllVideos(savedProvider);
});
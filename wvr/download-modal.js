document.addEventListener('DOMContentLoaded', () => {
    // --- Get all the DOM elements ---
    const downloadButtons = document.querySelectorAll('.download-btn');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modal = document.getElementById('downloadModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalTitle = document.getElementById('modalTitle');
    const modalList = document.getElementById('modalList');

    // --- Google Drive Download URL Base ---
    const gdriveDownloadBase = 'https://drive.google.com/uc?export=download&id=';

    // --- Function to open the modal ---
    const openModal = (unc, title) => {
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

    // --- Function to close the modal ---
    const closeModal = () => {
        modalBackdrop.classList.remove('show');
    };

    // --- Function to fetch and parse the video list ---
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
        
        const videoItems = doc.querySelectorAll('.video-item');
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

    // --- Attach all event listeners ---
    downloadButtons.forEach(button => {
        button.addEventListener('click', () => {
            const unc = button.dataset.unc;
            const title = button.dataset.title;
            openModal(unc, title);
        });
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

});
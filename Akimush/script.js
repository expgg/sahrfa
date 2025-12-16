document.addEventListener('DOMContentLoaded', () => {
    const bioElement = document.querySelector('.bio');
    bioElement.textContent = "Currently studying Electrical Engineering Technology and previously at City Polytechnic & Textile Institute, Rajshahi.";

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const applyAnimations = (tabElement) => {
        const elementsToAnimate = tabElement.querySelectorAll('.social-entry, .game-entry');
        elementsToAnimate.forEach((element, index) => {
            element.style.animation = 'none';
            void element.offsetWidth;
            if (element.classList.contains('social-entry') || element.classList.contains('game-entry')) {
                element.style.animation = `fadeIn 0.5s ease-out ${index * 0.05}s forwards`;
            }
        });
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tab;

            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            const activeTabContent = document.getElementById(targetTabId);
            activeTabContent.classList.add('active');
            button.classList.add('active');

            applyAnimations(activeTabContent);
        });
    });

    const initialActiveTab = document.querySelector('.tab-content.active');
    if (initialActiveTab) {
        applyAnimations(initialActiveTab);
    }
});
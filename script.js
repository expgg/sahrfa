document.addEventListener('DOMContentLoaded', () => {
    const bioElement = document.querySelector('.bio');
    bioElement.textContent = "I like computer stuff and enjoy making new things every day. I also love playing games and exploring new technologies.";

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const applyAnimations = (tabElement) => {
        const elementsToAnimate = tabElement.querySelectorAll('.social-entry, .game-entry');
        elementsToAnimate.forEach((element, index) => {
            element.style.animation = 'none';
            void element.offsetWidth; // Trigger reflow
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

    // Copy UID functionality
    const copyUidButtons = document.querySelectorAll('.copy-uid-button');
    copyUidButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the link from being followed if it's an <a> tag
            event.stopPropagation(); // Stop event bubbling to parent link

            const gameEntry = button.closest('.game-entry');
            const gameUidSpan = gameEntry.querySelector('.game-uid'); // Get the span with the UID
            const uidValue = gameUidSpan.dataset.uid; // Get the UID from the data-uid attribute
            const uidLabel = gameUidSpan.textContent.split(':')[0]; // Get the "UID" or "Player Tag" label

            if (uidValue) {
                const textToCopy = `${uidLabel}: ${uidValue}`;
                
                // Create a temporary textarea to copy text to clipboard
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = uidValue; // Only copy the UID value, not the label
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                
                try {
                    document.execCommand('copy');
                    // Provide visual feedback and animation
                    const originalTitle = button.title;
                    const originalColor = button.style.color;

                    button.title = 'Copied!';
                    button.style.color = '#4CAF50'; // Green color for copied feedback
                    button.classList.add('copied-animation'); // Add animation class

                    setTimeout(() => {
                        button.title = originalTitle;
                        button.style.color = originalColor; // Revert color
                        button.classList.remove('copied-animation'); // Remove animation class
                    }, 1500); // Reset after 1.5 seconds

                } catch (err) {
                    console.error('Failed to copy text: ', err);
                    // Fallback for environments where execCommand is restricted (using a custom message box)
                    const messageBox = document.createElement('div');
                    messageBox.textContent = 'Failed to copy. Please copy manually: ' + uidValue;
                    messageBox.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background-color: #333;
                        color: #fff;
                        padding: 15px 25px;
                        border-radius: 8px;
                        box-shadow: 0 0 15px rgba(0,0,0,0.5);
                        z-index: 1000;
                        font-family: 'Roboto', sans-serif;
                        font-size: 1em;
                        border: 1px solid #FF8C00;
                    `;
                    document.body.appendChild(messageBox);
                    setTimeout(() => {
                        document.body.removeChild(messageBox);
                    }, 3000); // Remove message after 3 seconds
                } finally {
                    document.body.removeChild(tempTextArea);
                }
            }
        });
    });
});

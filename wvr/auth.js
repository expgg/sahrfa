/*
* ======================================
* UPDATED FILE: auth.js
* Swapped in-memory cache for localStorage
* and added a 1-hour expiration.
* ======================================
*/

// --- 🔒 PASSWORD CONFIGURATION ---
// This is where you set the passwords.
// 'em', 'mm', and 'sm' MUST match the data-unc attributes.
const UNCLE_PASSWORDS = {
    'em': 'Enamul31051980',
    'mm': 'mm123',
    'sm': 'sm123'
};
// ----------------------------------

// --- ⏱️ EXPIRATION TIME ---
// 1 hour * 60 minutes * 60 seconds * 1000 milliseconds
const AUTH_DURATION_MS = 60 * 60 * 1000;
// -----------------------------

// --- Get Password Modal Elements ---
const passModalBackdrop = document.getElementById('passModalBackdrop');
const passModal = document.getElementById('passModal');
const passModalCloseBtn = document.getElementById('passModalCloseBtn');
const passForm = document.getElementById('passForm');
const passInput = document.getElementById('passInput');
const passError = document.getElementById('passError');

// --- State variables for the modal ---
let currentUnc = null;
let onSuccessCallback = null;
let onFailCallback = null;

/**
 * Checks if the user has a valid, non-expired auth token in localStorage.
 * @param {string} unc - The uncle identifier (e.g., 'em').
 * @returns {boolean} - True if authenticated, false otherwise.
 */
export const checkAuth = (unc) => {
    const authKey = `unc-auth-${unc}`;
    const savedData = localStorage.getItem(authKey);

    if (!savedData) {
        return false; // Not logged in
    }

    try {
        const authData = JSON.parse(savedData);
        if (!authData.timestamp) {
            localStorage.removeItem(authKey); // Corrupt data
            return false;
        }

        const now = Date.now();
        const timeElapsed = now - authData.timestamp;

        if (timeElapsed > AUTH_DURATION_MS) {
            // Auth has expired
            localStorage.removeItem(authKey); // Clear the expired key
            return false;
        }

        // Auth is valid and not expired
        return true;

    } catch (e) {
        // Data was corrupt
        console.error("Failed to parse auth data:", e);
        localStorage.removeItem(authKey);
        return false;
    }
};

/**
 * Saves the authentication status and a timestamp to localStorage.
 * @param {string} unc - The uncle identifier.
 */
const setAuth = (unc) => {
    const authKey = `unc-auth-${unc}`;
    const authData = {
        timestamp: Date.now() // Save the current time
    };
    localStorage.setItem(authKey, JSON.stringify(authData));
};

/**
 * Redirects the user to the homepage.
 */
export const redirectToHome = () => {
    window.location.href = 'index.html';
};

/**
 * Closes the password modal.
 */
const closePassModal = () => {
    passModalBackdrop.classList.remove('show');
    passError.textContent = '';
    passInput.value = '';
};

/**
 * Opens the password modal to prompt the user.
 * @param {string} unc - The uncle identifier being unlocked.
 * @param {function} onSuccess - The function to call if auth succeeds.
 * @param {function} onFail - The function to call if the user cancels.
 */
export const promptForPassword = (unc, onSuccess, onFail) => {
    currentUnc = unc;
    onSuccessCallback = onSuccess;
    onFailCallback = onFail;
    
    passModalBackdrop.classList.add('show');
    // Set a timeout to allow the modal to transition in before focusing
    setTimeout(() => {
        passInput.focus();
    }, 250);
};

// --- Event Listeners for the Password Modal ---

// Handle the form submission
passForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passInput.value;

    if (password === UNCLE_PASSWORDS[currentUnc]) {
        // Correct password
        setAuth(currentUnc); // Save to localStorage with timestamp
        closePassModal();
        if (onSuccessCallback) {
            onSuccessCallback();
        }
    } else {
        // Incorrect password
        passError.textContent = 'Incorrect password. Please try again.';
        passInput.value = '';
        passInput.focus();
    }
});

// Handle closing the modal (cancel)
passModalCloseBtn.addEventListener('click', () => {
    closePassModal();
    if (onFailCallback) {
        onFailCallback();
    }
});

passModalBackdrop.addEventListener('click', () => {
    closePassModal();
    if (onFailCallback) {
        onFailCallback();
    }
});
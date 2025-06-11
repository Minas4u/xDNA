// --- GLOBAL STATE & CONSTANTS ---

// A map of User IDs to their specific Google Apps Script web app URLs.
// This is the entry point for fetching user-specific training plans.
const userSpecificDataSources = {
    "ADMIN": "https://script.google.com/macros/s/AKfycbw04TBsnEs-rot_tpCEkDlgiNcpnuHF6HyZn4TsQ-oR3sIT4quBibSmw7UEJxbuZPJ7/exec",
    "ALEX": "https://script.google.com/macros/s/AKfycbxqan2-K__zvFqJZ-b-se2SxNfPPCDHjuRyTxdatvv3AvIdnkJOdkQm8v3SPhcVgWoQvA/exec",
    "PENNY": "https://script.google.com/macros/s/AKfycbwLnp_ejK7kWEuH3opf9YHgtFBAnVsM3la7KyVf_gwmjwhlEJ2mi5hRK470Npl6nZ2vYg/exec",
    "VASSO": "https://script.google.com/macros/s/AKfycbyVKYRRgK0V2X1iYBvOkJ8Rny0j5_Ct3cqFpmTkcy8r7WDySOAwnOnzA5gVdlFtOOT4nw/exec",
    "MANOS": "https://script.google.com/macros/s/AKfycbzq-iMRa798Z_Fw7_Ply7gSSqOt8SggVTtRTgS6WPpHtIN8jjvOlFwTDeBBbAU1M_Ws/exec",
    "MAKIS": "https://script.google.com/macros/s/AKfycby8a0HjdYJ5zCXid_FrfX7WF_EWWpQ-RfFUo0yuB0IBiZs1U_T28TtG_u83PWL-UUyN/exec",
    "SAKIS": "https://script.google.com/macros/s/AKfycbz9XApaSi9N6ml4nz7C-ybobIyzpG81E7Kqakmsi_iDinG5msJK-_b0ijDgYJmuSvGAnA/exec",
    "EVI": "tba",
    "EVA": "tba",
    "ELENI": "https://script.google.com/macros/s/AKfycbwHzz_ww7-0Ucb0METuQoaQLVDyOy505HE7SmMyLggvvIcZMIhMGe-BMBXyh8oJC6mt/exec",
    "KONA": "tba",
    "NIKOL": "tba",
    "IOANNA": "tba",
};

// Central data source for content common to all users (drills, mobility, strength, updates).
const companionDataUrl = "https://script.google.com/macros/s/AKfycbw3fpGf2W8ANwIaioiZdXZBeEjw3vr1g3XSLf3KXPR3wKLDPYSDpRbFGjJ-BDZLYd6rKg/exec";

// --- Application State Variables ---
let marathonPlan = null;            // Holds the entire JSON object from the Google Sheet.
let datedTrainingPlan = [];         // An array where each training day is assigned a specific calendar date.
let currentRaceDate = null;         // The calculated date of the race (plan end date).
let calendarCurrentDisplayDate = new Date(); // The month/year the calendar view is showing.
let companionData = null;           // Holds data from the companion app source.
let deferredInstallPrompt = null;   // For PWA installation prompt.
let overviewDate = new Date();      // The date currently displayed in the overview card.

// --- Chart Instances ---
let raceElevationChartInstance = null;
let mileageChartInstance = null;

// --- DOM Element Caching ---
// Caching frequently accessed DOM elements improves performance.
const loginContainer = document.getElementById('login-container');
const mainAppWrapper = document.getElementById('main-app-wrapper');
const appContent = document.getElementById('app-content');
const loadingMessageDiv = document.getElementById('loading-message');
const errorMessageDiv = document.getElementById('error-message');
const loginErrorMessageDiv = document.getElementById('login-error-message');
const loginLoadingMessageDiv = document.getElementById('login-loading-message');
const installPwaButton = document.getElementById('installPwaButton');
const userIdInput = document.getElementById('userIdInput');
const loginButton = document.getElementById('loginButton');
const darkModeToggle = document.getElementById('darkModeToggle');

// --- UTILITY FUNCTIONS ---

/**
 * Parses a pace string (e.g., "5:30") into total seconds per kilometer.
 * @param {string} paceString The pace string in "mm:ss" format.
 * @returns {number} Total seconds, or NaN if the format is invalid.
 */
function parsePaceToSeconds(paceString) {
    if (!paceString || typeof paceString !== 'string') return NaN;
    const parts = paceString.trim().split(':');
    if (parts.length !== 2) return NaN;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) return NaN;
    return (minutes * 60) + seconds;
}

/**
 * Formats a total number of seconds into a pace string (e.g., "5:30").
 * @param {number} totalSeconds The total seconds to format.
 * @returns {string} The formatted pace string "m:ss".
 */
function formatSecondsToPace(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "N/A";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Creates an HTML unordered list from an array of strings.
 * Supports simple HTML tags like <strong> within the strings.
 * @param {string[]} items Array of strings to be converted to list items.
 * @returns {string} An HTML `<ul>` element as a string.
 */
function createHtmlList(items) {
    if (!items || !Array.isArray(items)) return '';
    // The use of innerHTML is considered safe here as the content comes from a trusted Google Sheet source.
    return `<ul class="list-disc list-inside space-y-1 text-stone-700">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

/**
 * Checks if a variable is a valid, non-NaN Date object.
 * @param {any} d The variable to check.
 * @returns {boolean} True if it's a valid Date.
 */
function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

/**
 * Formats a Date object into a readable string.
 * @param {Date} date The date to format.
 * @param {object} options Intl.DateTimeFormat options.
 * @returns {string} The formatted date string.
 */
function formatDate(date, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
    if (!isValidDate(date)) return "N/A";
    return date.toLocaleDateString(undefined, options);
}

/**
 * Adds a specified number of days to a date.
 * @param {Date} date The starting date.
 * @param {number} days The number of days to add.
 * @returns {Date} The new date.
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Checks if two Date objects represent the same calendar day (ignores time).
 * @param {Date} date1 The first date.
 * @param {Date} date2 The second date.
 * @returns {boolean} True if they are the same day.
 */
function isSameDay(date1, date2) {
    if (!isValidDate(date1) || !isValidDate(date2)) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}


// --- INITIALIZATION & PWA ---

/**
 * Main entry point, runs when the DOM is fully loaded.
 * Sets up initial UI, event listeners for login, PWA, and dark mode.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Attempt to pre-fill the User ID from the last session.
    const lastUserId = localStorage.getItem('lastUserID');
    if (lastUserId && userIdInput) {
        userIdInput.value = lastUserId;
    }

    // Set up event listeners for the login process.
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (userIdInput) userIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleLogin();
        }
    });

    // --- PWA Installation Logic ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installPwaButton) {
            installPwaButton.classList.remove('hidden');
        }
    });

    if (installPwaButton) {
        installPwaButton.addEventListener('click', async () => {
            installPwaButton.classList.add('hidden');
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredInstallPrompt = null;
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installPwaButton) installPwaButton.classList.add('hidden');
        deferredInstallPrompt = null;
        console.log('PWA was installed successfully.');
    });

    // --- Dark Mode Toggle Functionality ---
    const sunIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.049 20.95l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M3.049 4.049l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>`;
    const moonIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = sunIconSVG;
        } else {
            document.body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = moonIconSVG;
        }
    };
    
    // Load saved theme from localStorage or use system preference.
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme || 'light');

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDarkMode = document.body.classList.toggle('dark-mode');
            const newTheme = isDarkMode ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // Show login screen by default.
    if(loginContainer) loginContainer.classList.remove('hidden');
    if(mainAppWrapper) mainAppWrapper.classList.add('hidden');
});

/**
 * Initializes the main application after a successful login and data fetch.
 * Hides login UI, shows the main app, sets up navigation, and renders the initial view.
 */
function initializeApp() {
    if (loadingMessageDiv) loadingMessageDiv.classList.add('hidden');
    if (errorMessageDiv) errorMessageDiv.classList.add('hidden');
    if (appContent) appContent.innerHTML = '';

    // Update static UI text elements with data from the sheet.
    updateStaticUIText();

    // Attach event listeners to all navigation elements.
    document.getElementById('nav-overview').addEventListener('click', renderOverview);
    document.getElementById('nav-plan').addEventListener('click', renderTrainingPlan);
    document.getElementById('nav-calendar').addEventListener('click', renderCalendarTab);
    document.getElementById('nav-race').addEventListener('click', renderRaceTab);
    document.getElementById('nav-companion').addEventListener('click', renderCompanionTab);
    document.getElementById('nav-info').addEventListener('click', renderInfoTab);

    // Set up modals (mileage chart and team updates).
    const mileageChartModal = document.getElementById('mileage-chart-modal');
    if (mileageChartModal) {
        document.getElementById('closeMileageChartBtn').addEventListener('click', () => mileageChartModal.classList.add('hidden'));
        mileageChartModal.addEventListener('click', (e) => {
            if (e.target.id === 'mileage-chart-modal') mileageChartModal.classList.add('hidden');
        });
    }

    const updatesModal = document.getElementById('updates-modal');
    if(updatesModal) {
        document.getElementById('close-updates-modal-btn').addEventListener('click', () => updatesModal.classList.add('hidden'));
        updatesModal.addEventListener('click', (e) => {
            if (e.target.id === 'updates-modal') updatesModal.classList.add('hidden');
        });
    }

    // Render the default view and transition from login to the main app.
    renderOverview();
    if(mainAppWrapper) mainAppWrapper.classList.remove('hidden');
    if(loginContainer) loginContainer.classList.add('hidden');

    // After the app is visible, check if we need to show the team updates modal.
    showUpdatesModalIfNeeded();
}


// --- LOGIN & DATA FETCHING ---

/**
 * Handles the login process. Validates user ID, fetches data, and initializes the app on success.
 */
async function handleLogin() {
    if (!userIdInput || !loginErrorMessageDiv || !loginLoadingMessageDiv) return;
    
    const userId = userIdInput.value.trim().toUpperCase();
    const webAppUrl = userSpecificDataSources[userId];

    loginErrorMessageDiv.classList.add('hidden');
    loginLoadingMessageDiv.classList.remove('hidden');

    if (webAppUrl && webAppUrl !== 'tba') {
        localStorage.setItem('lastUserID', userId); // Remember user for next visit.
        const success = await fetchMarathonPlan(webAppUrl);
        if (success) {
            initializeApp();
        } else {
            loginLoadingMessageDiv.classList.add('hidden');
            // The error message is displayed within fetchMarathonPlan.
        }
    } else {
        loginErrorMessageDiv.textContent = "Invalid User ID or plan not available. Please try again.";
        loginErrorMessageDiv.classList.remove('hidden');
        loginLoadingMessageDiv.classList.add('hidden');
    }
}

/**
 * Fetches the entire marathon training plan from the specified Google Apps Script URL.
 * Also performs validation and calculates the dated plan.
 * @param {string} webAppUrl The URL of the web app to fetch data from.
 * @returns {Promise<boolean>} True on successful fetch and parse, false otherwise.
 */
async function fetchMarathonPlan(webAppUrl) {
    try {
        const response = await fetch(webAppUrl);
        if (!response.ok) {
            throw new Error(`Network response error (status: ${response.status})`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Data error from Google Sheet: ${data.error}`);
        }

        // Simplified validation: check for the existence of essential top-level objects.
        if (!data.uiText || !data.settings || !data.phases || !data.newsSection) {
            throw new Error("Fetched data is incomplete or malformed. Check Apps Script and Sheet structure.");
        }

        marathonPlan = data;
        
        // --- Calculate Dated Plan ---
        // This is a critical step that gives each training day a real calendar date.
        const planStartDate = new Date(marathonPlan.settings.planStartDate + "T00:00:00");
        if (!isValidDate(planStartDate)) {
            throw new Error("Invalid or missing 'planStartDate' in Settings sheet.");
        }
        
        // Calculate the total number of days in the plan to determine the end date.
        let totalDaysInPlan = 0;
        marathonPlan.phases.forEach(phase => {
            phase.weeks.forEach(week => {
                totalDaysInPlan += week.days.length;
            });
        });
        if (totalDaysInPlan === 0) {
            throw new Error("Training plan contains no scheduled days. Check 'Full Training Plan' sheet.");
        }

        // The official race date is the last day of the plan.
        currentRaceDate = addDays(planStartDate, totalDaysInPlan - 1);
        
        // Now, assign a date to every single activity object.
        calculateAndStoreDatedTrainingPlan(planStartDate);
        
        // Set the calendar to initially display the month the plan starts in.
        calendarCurrentDisplayDate = new Date(planStartDate);
        calendarCurrentDisplayDate.setDate(1);

        return true;

    } catch (error) {
        console.error('Failed to fetch or process marathon plan:', error);
        if (loginErrorMessageDiv) {
            loginErrorMessageDiv.textContent = `Error: ${error.message}`;
            loginErrorMessageDiv.classList.remove('hidden');
        }
        return false;
    }
}

/**
 * Populates the `datedTrainingPlan` array by assigning a specific date to each training day,
 * starting from the plan's start date.
 * @param {Date} planStartDate The first day of the training plan.
 */
function calculateAndStoreDatedTrainingPlan(planStartDate) {
    if (!marathonPlan || !marathonPlan.phases || !isValidDate(planStartDate)) {
        datedTrainingPlan = [];
        return;
    }

    let allDaysScheduled = [];
    marathonPlan.phases.forEach(phase => {
        phase.weeks.forEach(week => {
            week.days.forEach(dayString => {
                // Create a comprehensive object for each day.
                allDaysScheduled.push({
                    activity: dayString,
                    notes: week.notes || "",
                    phaseName: phase.name,
                    weekNum: week.weekNum,
                    totalKm: week.totalKm
                });
            });
        });
    });

    // Assign a date to each day's object.
    datedTrainingPlan = allDaysScheduled.map((day, index) => {
        return {
            date: addDays(planStartDate, index),
            ...day
        };
    });
}


// --- UI RENDERING FUNCTIONS ---

/**
 * Updates static UI text elements (titles, button labels) using data from the fetched plan.
 * This makes the app easily customizable from the Google Sheet.
 */
function updateStaticUIText() {
    const uiText = marathonPlan?.uiText;
    if (!uiText) {
        console.warn("marathonPlan.uiText not available. Using default HTML text.");
        return;
    }

    // Helper to set text content if the element exists.
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el && text) el.textContent = text;
    };

    setText('mainTitleProject', uiText.mainTitleProject);
    setText('mainTitleMarathon', uiText.mainTitleMarathon);
    setText('appHeaderTitleProject', uiText.mainTitleProject);
    setText('appHeaderTitleMarathon', uiText.mainTitleMarathon);
    setText('appSubtitle', uiText.appSubtitle);
    setText('loginButton', uiText.loginButtonText);
    setText('nav-overview', uiText.navButtonOverview);
    setText('nav-plan', uiText.navButtonPlan);
    setText('nav-calendar', uiText.navButtonCalendar);
    setText('nav-race', uiText.navButtonRace);
    setText('nav-companion', uiText.navButtonCompanion);
    setText('nav-info', uiText.navButtonInfo);
}

/**
 * Sets the visual "active" state for the currently selected navigation button.
 * @param {string} activeId The ID of the nav button to activate (e.g., 'nav-overview').
 */
function setActiveNav(activeId) {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(btn => {
        // Remove all possible active classes first.
        btn.classList.remove('active-overview', 'active-plan', 'active-calendar', 'active-race', 'active-companion', 'active-info');
        if (btn.id === activeId) {
            // Add the specific active class based on the button's ID.
            const activeClass = `active-${activeId.split('-')[1]}`;
            btn.classList.add(activeClass);
        }
    });
}

// --- OVERVIEW TAB ---
// (Functions related to rendering the main overview screen)

async function renderOverview() {
    setActiveNav('nav-overview');
    // Reset overviewDate to today whenever the tab is clicked
    overviewDate = new Date(); 
    appContent.innerHTML = `
        <section id="overview-content" class="space-y-6">
            <div class="md:flex md:space-x-6 space-y-6 md:space-y-0 mb-6">
                <!-- Today's Training Card -->
                <div id="todays-training-card" class="content-card p-4 md:flex-1 custom-rect-border-today">
                    <div id="todays-training-content"></div>
                </div>
                <!-- This Week's Plan Card -->
                <div id="this-weeks-plan-card" class="content-card p-4 md:flex-1 custom-rect-border-this-week">
                    <div id="this-weeks-plan-content"></div>
                </div>
            </div>
        </section>`;
    
    // Asynchronously render the content for the two main cards.
    renderOverviewDay(overviewDate);
    renderThisWeeksPlan();
}

/**
 * Renders the content for the main overview card for a specific date.
 * @param {Date} date The date to display training for.
 */
function renderOverviewDay(date) {
    const container = document.getElementById('todays-training-content');
    if (!container || !marathonPlan) return;

    const activityForDate = datedTrainingPlan.find(item => isSameDay(item.date, date));

    // Determine the title for the card (Today, Tomorrow, Yesterday, or the date)
    const today = new Date();
    let cardTitle = '';
    if (isSameDay(date, today)) {
        cardTitle = 'Today';
    } else if (isSameDay(date, addDays(today, 1))) {
        cardTitle = 'Tomorrow';
    } else if (isSameDay(date, addDays(today, -1))) {
        cardTitle = 'Yesterday';
    } else {
        cardTitle = formatDate(date, { weekday: 'long' });
    }

    const titleHtml = `
        <div class="flex items-center justify-between mb-1">
            <button id="overview-prev-day" class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <svg class="w-6 h-6 text-sky-700 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div class="text-center">
                <h3 class="text-2xl font-semibold text-sky-700">${cardTitle}</h3>
                <p class="text-xs text-stone-500">${formatDate(date, { month: 'long', day: 'numeric' })}</p>
            </div>
            <button id="overview-next-day" class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <svg class="w-6 h-6 text-sky-700 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
        </div>`;

    let activityContentHtml = '';
    let notesBoxHtml = '';
    
    if (activityForDate) {
        const activityDescription = activityForDate.activity.replace(/^[^:]+:\s*/, '').trim();
        const activityType = activityDescription.split(" ")[0].toLowerCase().replace(/:$/, '');
        const colorClass = getActivityTextColorClass(activityType);

        const lt2PaceString = marathonPlan.settings.defaultLt2Speed;
        const paceString = getPaceStringForActivity(activityForDate.activity, lt2PaceString);
        const paceHtml = paceString ? `<p class="pace-text text-lg font-semibold mt-1 ${colorClass}">Pace: ${paceString}</p>` : '';

        activityContentHtml = `
            <div class="todays-activity-box">
                <p><strong class="activity-text ${colorClass}">${activityDescription}</strong></p>
                ${paceHtml}
                <p class="text-xs text-stone-500 mt-2">Phase: ${activityForDate.phaseName} | Week: ${activityForDate.weekNum}</p>
            </div>`;
        
        if (activityForDate.notes) {
            notesBoxHtml = `
                <div class="todays-weekly-notes-box">
                    <p class="text-sm italic"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${activityForDate.notes}</span></p>
                </div>`;
        }
    } else {
        let message = "No training scheduled for this day.";
        activityContentHtml = `<div class="todays-activity-box"><p class="text-stone-700">${message}</p></div>`;
    }
    
    // Pace Calculator section for the overview card.
    const paceCalculatorHtml = `
        <div class="mt-4 space-y-2">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-sky-700">Pace Zones</h3>
                <button id="toggleZonesButton" class="hidden">Show</button>
            </div>
            <div id="today-zones-content"></div>
            <div class="flex justify-between items-center mt-2">
                <h3 class="text-lg font-semibold text-yellow-500">Repeats</h3>
                <button id="toggleRepeatsButton" class="hidden">Show</button>
            </div>
            <div id="today-repeats-content" class="mt-1"></div>
        </div>`;
        
    container.innerHTML = titleHtml + activityContentHtml + notesBoxHtml + paceCalculatorHtml;

    // Render the pace tables (initially hidden).
    renderTodayPaces(marathonPlan.settings.defaultLt2Speed, activityForDate);

    // Add event listeners for the new navigation buttons
    document.getElementById('overview-prev-day').addEventListener('click', () => {
        overviewDate = addDays(overviewDate, -1);
        renderOverviewDay(overviewDate);
    });
    document.getElementById('overview-next-day').addEventListener('click', () => {
        overviewDate = addDays(overviewDate, 1);
        renderOverviewDay(overviewDate);
    });
}


function renderThisWeeksPlan() {
    const container = document.getElementById('this-weeks-plan-content');
    if (!container || !marathonPlan || !datedTrainingPlan.length === 0) {
        if (container) container.innerHTML = `<p>This week's plan is unavailable.</p>`;
        return;
    }

    const thisWeeksPlanTitle = marathonPlan.uiText.overview.thisWeeksPlanTitle || "This Week";
    
    // Determine the start of the current week (Monday).
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ...
    const startOfWeekOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to make Monday the start.
    const monday = addDays(today, startOfWeekOffset);
    
    let currentWeekActivities = [];
    let weekNotes = "";

    // Find all activities for the current week.
    for (let i = 0; i < 7; i++) {
        const dayInWeek = addDays(monday, i);
        const activityForDay = datedTrainingPlan.find(item => isSameDay(item.date, dayInWeek));
        
        let displayDayName = dayInWeek.toLocaleDateString(undefined, { weekday: 'short' });
        let activityDescription = "Rest or Unscheduled";
        
        if (activityForDay) {
            // Use the first note found in the week as the weekly note.
            if (!weekNotes && activityForDay.notes) weekNotes = activityForDay.notes;

            // Extract the activity description, removing the day prefix (e.g., "Mon: ").
            const activityString = activityForDay.activity;
            const dayPrefixMatch = activityString.match(/^(\w{3,4}(\s\d{1,2})?):\s*(.*)/s);
            if (dayPrefixMatch) {
                displayDayName = dayPrefixMatch[1].trim();
                activityDescription = dayPrefixMatch[3].trim();
            } else {
                activityDescription = activityString.trim();
            }
        }
        currentWeekActivities.push({ dayName: displayDayName, activity: activityDescription });
    }

    const dayColors = ['bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50', 'bg-green-50', 'bg-emerald-50'];
    const tableRowsHtml = currentWeekActivities.map((dayEntry, index) => {
        const bgColor = dayColors[index % dayColors.length];
        return `<tr class="${bgColor}">
                    <td class="p-3 font-bold text-stone-800">${dayEntry.dayName}</td>
                    <td class="p-3 text-stone-700">${dayEntry.activity}</td>
                </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="flex items-center mb-2">
            <h3 class="text-2xl font-semibold text-green-700 text-center flex-grow">${thisWeeksPlanTitle}</h3>
            <button id="printWeekPdfBtn" class="pdf-button ml-auto no-print">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 2.5A2.5 2.5 0 0 1 7.5 0h5A2.5 2.5 0 0 1 15 2.5V5h-2.55a3 3 0 0 0-4.9 0H5V2.5zM10 6a2 2 0 0 0-1.936 1.5H5V15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7.5h-3.064A2 2 0 0 0 10 6zm0 2a.75.75 0 0 1 .75.75v.032l1.533.306a.75.75 0 0 1-.293 1.455l-1.68-.335a.75.75 0 0 1-.59-.518L9.25 8.75A.75.75 0 0 1 10 8z" clip-rule="evenodd" /></svg>
                PDF
            </button>
        </div>
        <div id="this-weeks-plan-printable-area" class="printable-area">
            <div class="overflow-x-auto rounded-lg border border-stone-200">
                <table class="schedule-table min-w-full">
                    <thead>
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Day</th>
                            <th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Activity</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-stone-200">${tableRowsHtml}</tbody>
                </table>
            </div>
            ${weekNotes ? `<p class="text-sm italic mt-3 p-3 bg-stone-100 rounded-md"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${weekNotes}</span></p>` : ''}
        </div>`;
    
    // Add event listener for the PDF print button.
    document.getElementById('printWeekPdfBtn').addEventListener('click', () => printSelectedWeekToPdf('this-weeks-plan-printable-area'));
}


// --- TRAINING PLAN TAB ---
// (Functions for the detailed, multi-week training plan view)
// [This section's functions (renderTrainingPlan, renderPhaseDetails, etc.) are complex but were already well-structured.
// They will be kept as-is, as the refactoring on the backend did not change the phases/weeks data structure.]
// NOTE: For brevity in this refactored example, these functions are listed by name. The full code is identical to your original script.

// renderTrainingPlan()
// renderPhaseDetails(phaseIndex)
// getWeekDateRangeString(weekObject, phaseName)
// getDisplayKm(totalKmString)
// renderWeekDetails(phaseIndex, weekIndex)


// --- CALENDAR TAB ---
// (Functions for the interactive calendar view)
// [This section's functions (renderCalendarTab, renderCalendarGrid, etc.) are also kept as-is.]

// renderCalendarTab()
// renderCalendarGrid()
// renderSelectedCalendarDayDetails(date)


// --- RACE TAB ---
// (Functions for the race day hub)
// [This section's functions (renderRaceTab, renderRaceElevationChart) are kept as-is.]

// renderRaceTab()
// renderRaceElevationChart()


// --- COMPANION & INFO TABS ---
// (Functions for fetching and displaying centralized content)
// [This section's functions are kept as-is.]

// ensureCompanionData()
// renderCompanionTab()
// renderInfoTab()
// ... and their helpers (setActiveCompanionNav, createExerciseCard, etc.)


// --- PACE CALCULATOR & STYLING HELPERS ---
// (Functions that calculate paces and determine CSS classes)
// [This section's functions are kept as-is.]

// getActivityTextColorClass(activityFirstWord)
// getPaceStringForActivity(activityString, lt2PaceString)
// renderTodayPaces(lt2PaceString, todaysActivityForHighlight)
// getPhaseButtonClass(phaseName)
// ... and other styling helpers.


/* ================================================================================= */
/* NOTE: To keep this refactoring example clear, only the core logic affected by   */
/* the backend changes has been shown in detail. The functions for the other tabs  */
/* (`renderTrainingPlan`, `renderCalendarTab`, `renderRaceTab`, etc.) remain       */
/* identical to your original `script.js` file and are omitted here for brevity.   */
/* The full, working code would include all of those original functions.           */
/* ================================================================================= */

// --- The rest of your original script.js file would follow here ---
// (Including all the rendering functions for Plan, Calendar, Race, Companion, Info tabs,
// and all the helper functions for styling and pace calculations.)

// --- Abridged Example: Pasting the full, unchanged functions would be too verbose. ---
// --- Assume the rest of the original script.js functions are here. ---

// Placeholder for the rest of the functions from the original script
function renderTrainingPlan() { /* ... Full original code ... */ }
function renderPhaseDetails(phaseIndex) { /* ... Full original code ... */ }
function getWeekDateRangeString(weekObject, phaseName) { /* ... Full original code ... */ }
function getDisplayKm(totalKmString) { /* ... Full original code ... */ }
function renderWeekDetails(phaseIndex, weekIndex) { /* ... Full original code ... */ }
function renderCalendarTab() { /* ... Full original code ... */ }
function renderCalendarGrid() { /* ... Full original code ... */ }
function renderSelectedCalendarDayDetails(date) { /* ... Full original code ... */ }
function renderRaceTab() { /* ... Full original code ... */ }
function renderRaceElevationChart() { /* ... Full original code ... */ }
async function ensureCompanionData() { /* ... Full original code ... */ }
async function renderCompanionTab() { /* ... Full original code ... */ }
function setActiveCompanionNav(activeId) { /* ... Full original code ... */ }
function renderCompanionDrills() { /* ... Full original code ... */ }
function renderCompanionMobility() { /* ... Full original code ... */ }
function renderCompanionStrength() { /* ... Full original code ... */ }
function createExerciseCard(item, type) { /* ... Full original code ... */ }
function renderInfoTab() { /* ... Full original code ... */ }
function getActivityTextColorClass(activityFirstWord) { /* ... Full original code ... */ }
function getPaceStringForActivity(activityString, lt2PaceString) { /* ... Full original code ... */ }
function renderTodayPaces(lt2PaceString, todaysActivityForHighlight) { /* ... Full original code ... */ }
function getPhaseButtonClass(phaseName) { /* ... Full original code ... */ }
function getPhaseTitleBorderColor(phaseName) { /* ... Full original code ... */ }
function getPhaseTitleTextColorClass(phaseName) { /* ... Full original code ... */ }
function getPhaseTextColorClass(phaseName) { /* ... Full original code ... */ }
function getActivityThumbnailClass(activityText) { /* ... Full original code ... */ }
function printSelectedWeekToPdf(printableAreaId) { /* ... Full original code ... */ }
async function showUpdatesModalIfNeeded() { /* ... Full original code ... */ }
function renderMileageChart() { /* ... Full original code ... */ }

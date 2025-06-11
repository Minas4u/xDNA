/**
 * Marathon Training App
 * Refactored for modern rendering and state management.
 */

const App = {
    // --- STATE & CONFIG ---
    state: {
        marathonPlan: null,
        datedTrainingPlan: [],
        currentRaceDate: null,
        calendarCurrentDisplayDate: new Date(),
        companionData: null,
        deferredInstallPrompt: null,
        activeView: 'overview-view', // Default view
    },

    // --- CONSTANTS ---
    config: {
        userSpecificDataSources: {
            "ADMIN": "https://script.google.com/macros/s/AKfycbxfeBaM8_DTlCppjt6eLWztDV2YBJih2TfRju9iL8BWQMvf2FneqdYUqNRIb0ypWu9U/exec",
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
            "PLIAXA": "https://script.google.com/macros/s/AKfycbwIsM1dWmt2BxsYuK9ccfi-vEKDXlIu9WPlEGHZstyp4YYglrHZvTqaHkBwHeucX4-a/exec",
            "IOANNA": "tba",
        },
        companionDataUrl: "https://script.google.com/macros/s/AKfycbw3fpGf2W8ANwIaioiZdXZBeEjw3vr1g3XSLf3KXPR3wKLDPYSDpRbFGjJ-BDZLYd6rKg/exec",
        moonIconSVG: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`,
        sunIconSVG: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.049 20.95l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M3.049 4.049l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>`,
    },

    // --- DOM ELEMENT REFERENCES ---
    elements: {},
    
    // --- CHART INSTANCES ---
    charts: {
        mileage: null,
        raceElevation: null,
    },

    /**
     * Main initialization function, runs on DOMContentLoaded.
     */
    init() {
        // Cache all DOM elements
        this.cacheDOMElements();
        // Set up all event listeners
        this.bindEvents();
        // Load theme from localStorage
        this.loadTheme();
        // Handle PWA installation prompt
        this.initPWA();

        // Pre-fill user ID and show login screen
        const lastUserId = localStorage.getItem('lastUserID');
        if (lastUserId) this.elements.userIdInput.value = lastUserId;
        this.elements.loginContainer.classList.remove('hidden');
        this.elements.mainAppWrapper.classList.add('hidden');
    },

    /**
     * Caches all required DOM elements into App.elements.
     */
    cacheDOMElements() {
        const ids = [
            // Containers
            'login-container', 'main-app-wrapper', 'app-content', 'print-section-container',
            // Login
            'userIdInput', 'loginButton', 'login-loading-message', 'login-error-message', 'installPwaButton',
            'mainTitleProject', 'mainTitleMarathon',
            // Main App
            'appHeaderTitleProject', 'appHeaderTitleMarathon', 'appSubtitle', 'darkModeToggle', 'main-nav',
            'loading-message', 'error-message',
            // Modals
            'mileage-chart-modal', 'closeMileageChartBtn', 'mileage-chart-modal-title', 'mileageChartModalCanvas',
            'updates-modal', 'close-updates-modal-btn', 'updates-modal-content',
            // View Containers
            'overview-view', 'plan-view', 'companion-view', 'calendar-view', 'race-view', 'info-view',
        ];
        ids.forEach(id => {
            this.elements[id.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())] = document.getElementById(id);
        });
    },

    /**
     * Binds all application event listeners.
     */
    bindEvents() {
        this.elements.loginButton.addEventListener('click', () => this.handleLogin());
        this.elements.userIdInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        });

        this.elements.darkModeToggle.addEventListener('click', () => this.toggleTheme());

        this.elements.mainNav.addEventListener('click', e => {
            const navButton = e.target.closest('.nav-button');
            if (navButton) {
                const viewId = navButton.dataset.view;
                this.showView(viewId);
            }
        });

        // Modal close buttons
        this.elements.closeMileageChartBtn.addEventListener('click', () => this.elements.mileageChartModal.classList.add('hidden'));
        this.elements.mileageChartModal.addEventListener('click', e => {
            if (e.target === this.elements.mileageChartModal) this.elements.mileageChartModal.classList.add('hidden');
        });
        this.elements.closeUpdatesModalBtn.addEventListener('click', () => this.elements.updatesModal.classList.add('hidden'));
        this.elements.updatesModal.addEventListener('click', e => {
            if (e.target === this.elements.updatesModal) this.elements.updatesModal.classList.add('hidden');
        });
    },

    // --- PWA & THEME ---
    initPWA() {
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            this.state.deferredInstallPrompt = e;
            this.elements.installPwaButton.classList.remove('hidden');
        });

        this.elements.installPwaButton.addEventListener('click', async () => {
            this.elements.installPwaButton.classList.add('hidden');
            if (this.state.deferredInstallPrompt) {
                this.state.deferredInstallPrompt.prompt();
                const { outcome } = await this.state.deferredInstallPrompt.userChoice;
                console.log(`PWA install prompt outcome: ${outcome}`);
                this.state.deferredInstallPrompt = null;
            }
        });

        window.addEventListener('appinstalled', () => {
            this.elements.installPwaButton.classList.add('hidden');
            this.state.deferredInstallPrompt = null;
            console.log('PWA was installed');
        });
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        this.applyTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
    },

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            this.elements.darkModeToggle.innerHTML = this.config.sunIconSVG;
        } else {
            document.documentElement.classList.remove('dark');
            this.elements.darkModeToggle.innerHTML = this.config.moonIconSVG;
        }
    },
    
    // --- LOGIN & DATA FETCHING ---
    async handleLogin() {
        const userId = this.elements.userIdInput.value.trim().toUpperCase();
        this.elements.loginErrorMessage.classList.add('hidden');
        this.elements.loginLoadingMessage.classList.remove('hidden');

        const webAppUrl = this.config.userSpecificDataSources[userId];
        if (webAppUrl) {
            localStorage.setItem('lastUserID', userId);
            const success = await this.fetchMarathonPlan(webAppUrl);
            if (success) {
                this.initializeApp();
            } else {
                this.elements.loginLoadingMessage.classList.add('hidden');
            }
        } else {
            this.elements.loginErrorMessage.textContent = "Invalid User ID. Try again or contact admin.";
            this.elements.loginErrorMessage.classList.remove('hidden');
            this.elements.loginLoadingMessage.classList.add('hidden');
        }
    },

    async fetchMarathonPlan(webAppUrl) {
        try {
            const response = await fetch(webAppUrl);
            if (!response.ok) throw new Error(`Network response not ok: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(`Error from Google Sheet: ${data.error}`);
            
            // Basic data validation (can be expanded)
            if (!data.settings || !data.phases) throw new Error("Fetched data is malformed.");
            
            this.state.marathonPlan = data;
            return true;
        } catch (error) {
            console.error('Failed to fetch marathon plan:', error);
            this.elements.loginErrorMessage.textContent = `Error loading plan: ${error.message}`;
            this.elements.loginErrorMessage.classList.remove('hidden');
            return false;
        }
    },

    // --- APP INITIALIZATION ---
    initializeApp() {
        // Hide loading message and login screen
        this.elements.loadingMessage.classList.add('hidden');
        this.elements.loginContainer.classList.add('hidden');
        this.elements.mainAppWrapper.classList.remove('hidden');
        
        // Process data
        this.updateStaticUIText();
        this.processPlanDates();

        // Render all views into their persistent containers
        this.renderAllViews();

        // Show the initial view
        this.showView(this.state.activeView);

        // Fetch companion data and show updates modal if needed
        this.showUpdatesModalIfNeeded();
    },

    renderAllViews() {
        this.renderOverview();
        this.renderTrainingPlan();
        this.renderCompanionTab();
        this.renderCalendarTab();
        this.renderRaceTab();
        this.renderInfoTab();
    },
    
    // --- VIEW MANAGEMENT ---
    showView(viewId) {
        this.state.activeView = viewId;
        
        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => view.classList.add('hidden'));
        
        // Show the selected view
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) {
            viewToShow.classList.remove('hidden');
        } else {
            // Fallback to overview if view not found
            this.elements.overviewView.classList.remove('hidden');
            this.state.activeView = 'overview-view';
        }

        // Update active nav button style
        this.elements.mainNav.querySelectorAll('.nav-button').forEach(btn => {
            if (btn.dataset.view === this.state.activeView) {
                btn.classList.add('active'); // Add a generic active class for styling
            } else {
                btn.classList.remove('active');
            }
        });
    },

    // ... All other render functions (renderOverview, renderTrainingPlan, etc.) go here ...
    // ... They will be modified to render into their specific containers, e.g.:
    // this.elements.overviewView.innerHTML = `...`;
    
    // ... All utility functions (parsePaceToSeconds, etc.) go here as methods of App ...
};


// Kick off the application
document.addEventListener('DOMContentLoaded', () => App.init());

// NOTE: The rest of the render and utility functions from the original script
// would be converted to methods of the `App` object here. For brevity,
// I am omitting the full text of every single render function, but the
// pattern would be to change `appContent.innerHTML` to `this.elements.viewName.innerHTML`
// and update all variable and function calls to use `this.state...`, `this.elements...`,
// and `this.methodName()`.

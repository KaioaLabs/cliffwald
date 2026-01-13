export class LoginManager {
    private onSuccess: (token: string, skin: string, username: string) => void;
    private authToken: string = "";
    private skin: string = "player_idle";
    private username: string = "";

    constructor(onSuccess: (token: string, skin: string, username: string) => void) {
        this.onSuccess = onSuccess;
    }

    private getApiUrl(endpoint: string) {
        const host = window.location.hostname;
        const port = (host === "localhost" || host === "127.0.0.1") ? ":2568" : (window.location.port ? ':' + window.location.port : '');
        const protocol = window.location.protocol;
        return `${protocol}//${host}${port}${endpoint}`;
    }

    public async autoLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const devUser = urlParams.get("dev_user");
        const skin = urlParams.get("skin");

        if (devUser) {
            console.log(`[DEBUG] Attempting Dev Login for: ${devUser}`);
            try {
                const apiUrl = this.getApiUrl("/api/dev-login");

                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: devUser })
                });

                if (!res.ok) throw new Error("Dev Login Failed");
                
                const data = await res.json();
                console.log("[DEBUG] Got Token:", data.token);
                
                this.authToken = data.token;
                this.skin = skin || "player_idle";
                this.username = devUser;

                this.finalizeLogin();
            } catch (e) {
                console.error("Dev Auto-Login Error:", e);
                this.setupLoginScreen();
            }
        } else {
            console.log("Waiting for user login...");
            this.setupLoginScreen();
        }
    }

    private setupLoginScreen() {
        const screen = document.getElementById('login-screen');
        if (!screen) return;
        screen.classList.remove('hidden');

        // UI Elements
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');
        const inputUser = document.getElementById('login-username') as HTMLInputElement;
        const inputPass = document.getElementById('login-password') as HTMLInputElement;
        const btnLogin = document.getElementById('btn-login-action');
        const btnRegister = document.getElementById('btn-register-action');
        const btnBack = document.getElementById('btn-back-login');
        const selectHouse = document.getElementById('reg-house') as HTMLSelectElement;
        const status = document.getElementById('login-status');
        const regUserDisplay = document.getElementById('reg-username-display');

        // Cached Credentials
        let cachedUser = "";
        let cachedPass = "";

        // --- LOGIN FLOW ---
        const handleLogin = async () => {
            cachedUser = inputUser.value.trim();
            cachedPass = inputPass.value.trim();
            if (!cachedUser || !cachedPass) {
                if (status) status.innerText = "Username and Password required.";
                return;
            }

            if (status) status.innerText = "Authenticating...";

            try {
                const res = await fetch(this.getApiUrl("/api/login"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: cachedUser, password: cachedPass })
                });

                if (res.status === 404) {
                    // USER NOT FOUND -> GO TO REGISTER
                    if (status) status.innerText = "";
                    if (formLogin) formLogin.classList.add('hidden');
                    if (formRegister) formRegister.classList.remove('hidden');
                    if (regUserDisplay) regUserDisplay.innerText = cachedUser;
                } else if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Login Failed");
                } else {
                    // SUCCESS
                    const data = await res.json();
                    this.authToken = data.token;
                    this.skin = data.skin; // Server tells us the skin!
                    this.username = cachedUser;
                    this.finalizeLogin();
                }
            } catch (e: any) {
                if (status) status.innerText = e.message;
            }
        };

        // --- REGISTER FLOW ---
        const handleRegister = async () => {
            const house = selectHouse.value;
            let skin = "player_idle";
            if (house === 'ignis') skin = "player_red";
            if (house === 'axiom') skin = "player_blue";
            if (house === 'vesper') skin = "player_green";

            if (status) status.innerText = "Enrolling...";

            try {
                const res = await fetch(this.getApiUrl("/api/register"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        username: cachedUser, 
                        password: cachedPass, 
                        skin, 
                        house 
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Registration Failed");
                }

                const data = await res.json();
                this.authToken = data.token;
                this.skin = skin;
                this.username = cachedUser;
                this.finalizeLogin();

            } catch (e: any) {
                if (status) status.innerText = e.message;
            }
        };

        // Bind Events
        const replaceListener = (el: HTMLElement | null, fn: () => void) => {
            if (!el) return;
            const newEl = el.cloneNode(true);
            el.parentNode?.replaceChild(newEl, el);
            newEl.addEventListener('click', (e) => {
                e.stopPropagation();
                fn();
            });
        };

        replaceListener(btnLogin, handleLogin);
        replaceListener(btnRegister, handleRegister);
        replaceListener(btnBack, () => {
            if (formRegister) formRegister.classList.add('hidden');
            if (formLogin) formLogin.classList.remove('hidden');
            if (status) status.innerText = "";
        });

        // Input Safety
        [inputUser, inputPass].forEach(input => {
            if (!input) return;
            const stopProp = (e: Event) => e.stopPropagation();
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleLogin();
            });
            input.addEventListener('keyup', stopProp);
            input.addEventListener('keypress', stopProp);
        });
    }


    private finalizeLogin() {
        // Hide login screen
        const screen = document.getElementById('login-screen');
        if (screen) screen.classList.add('hidden');

        this.onSuccess(this.authToken, this.skin, this.username);
    }
}
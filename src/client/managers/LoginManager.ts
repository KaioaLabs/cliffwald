export class LoginManager {
    private onSuccess: (token: string, skin: string) => void;
    private authToken: string = "";
    private skin: string = "player_idle";

    constructor(onSuccess: (token: string, skin: string) => void) {
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

        const btnCustom = document.getElementById('btn-login-custom');
        const inputUser = document.getElementById('login-username') as HTMLInputElement;
        const inputPass = document.getElementById('login-password') as HTMLInputElement;
        const selectHouse = document.getElementById('login-house') as HTMLSelectElement;

        // Clone to remove old listeners
        const newBtn = btnCustom?.cloneNode(true);
        if (btnCustom && newBtn) {
            btnCustom.parentNode?.replaceChild(newBtn, btnCustom);
            
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const user = inputUser.value.trim();
                const pass = inputPass.value.trim();
                if (!user || !pass) {
                    const status = document.getElementById('login-status');
                    if (status) status.innerText = "Username and Password required.";
                    return;
                }
                
                const house = selectHouse.value;
                let skin = "player_idle";
                if (house === 'ignis') skin = "player_red";
                if (house === 'axiom') skin = "player_blue";
                if (house === 'vesper') skin = "player_green";

                this.doLogin(user, pass, skin, house);
            });
        }
    }
    
    private async doLogin(username: string, password: string, skin: string, house: string) {
        try {
            const apiUrl = this.getApiUrl("/api/auth"); 

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, skin, house })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || res.statusText);
            }

            const data = await res.json();
            
            this.authToken = data.token;
            this.skin = skin;
            
            this.finalizeLogin();
        } catch (e: any) { 
            console.error("Login Failed:", e);
            const status = document.getElementById('login-status');
            if (status) status.innerText = `Login Failed: ${e.message}`;
        }
    }

    private finalizeLogin() {
        // Hide login screen
        const screen = document.getElementById('login-screen');
        if (screen) screen.classList.add('hidden');

        this.onSuccess(this.authToken, this.skin);
    }
}
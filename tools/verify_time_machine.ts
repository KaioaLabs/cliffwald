const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        }).on('error', reject);
    });
}

async function testTimeMachine() {
    console.log("--- INICIANDO TEST DE TIME MACHINE ---");
    const baseUrl = 'http://localhost:2568';
    
    try {
        await post(`${baseUrl}/api/debug/time-scale`, { scale: 1000 });
        console.log("Velocidad aumentada a 1000x.");
        
        console.log("Esperando 2 segundos...");
        await new Promise(r => setTimeout(r, 2000));

        await post(`${baseUrl}/api/debug/time-scale`, { scale: 1 });
        console.log("Velocidad reseteada a 1x.");
        
        console.log("--- TEST COMPLETADO ---");
    } catch (e) {
        console.error("Fallo:", e.message);
        process.exit(1);
    }
}

testTimeMachine();
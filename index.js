const https = require('https');
const axios = require('axios');
const crypto = require('crypto');

class Kreta {
    static IDP = "https://idp.e-kreta.hu";
}

class KretaEndpoints {
    static token = "/connect/token";
    static nonce = "/nonce";
}

class User {
    constructor(usr, pwd, ist) {
        this.usr = usr;
        this.pwd = pwd;
        this.ist = ist;

        // userAgent and clientID
        this.userAgent = "hu.ekreta.student/1.0.5/Android/0/0";
        this.clientID = "kreta-ellenorzo-mobile-android";
    }

    async getToken() {
        // gets access token
        // headers: special to token
        const key = Buffer.from([98, 97, 83, 115, 120, 79, 119, 108, 85, 49, 106, 77]);
        
        // Újrapróbálkozás 3-szor, 1 másodperces késleltetéssel
        async function retryWithDelay(fn, maxRetries, delay) {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    return await fn();
                } catch (error) {
                    console.error("Error:", error.message);
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            throw new Error("Max retries reached");
        }

        const nonce = await retryWithDelay(() => axios.get(Kreta.IDP + KretaEndpoints.nonce), 3, 1000)
            .then(response => response.data)
            .catch(error => {
                console.error("Error fetching nonce:", error.message);
                throw error;
            });

        const message = Buffer.from(this.ist.toUpperCase() + nonce + this.usr.toUpperCase(), 'utf-8');
        const dig = crypto.createHmac('sha512', key).update(message).digest();
        const generated = dig.toString('base64');
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "User-Agent": "hu.ekreta.student/1.0.5/Android/0/0",
            "X-AuthorizationPolicy-Key": generated,
            "X-AuthorizationPolicy-Version": "v2",
            "X-AuthorizationPolicy-Nonce": nonce
        };

        // data to send
        const data = {
            "userName": this.usr,
            "password": this.pwd,
            "institute_code": this.ist,
            "grant_type": "password",
            "client_id": this.clientID
        };

        // Proxy beállítás
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0; // Ezt csak a tesztelés során használd, ne termelésben!
        const axiosInstance = axios.create({
            httpsAgent: new https.Agent({  
                rejectUnauthorized: false
            })
        });

        // Így használd az axios helyett
        const response = await axiosInstance.post(`${Kreta.IDP}${KretaEndpoints.token}`, new URLSearchParams(data), { headers });
        
        try {
            const accessToken = response.data.access_token;
            console.log("Access Token:", accessToken);
            return accessToken;
        } catch (error) {
            // occasionally it gives a 502 error
            console.error("Error parsing response:", response.data);
            return response.data;
        }
    }
}

// Example usage
(async () => {
    await new User('username', 'password', 'institute').getToken();
})();

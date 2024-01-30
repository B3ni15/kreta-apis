const fetch = require('node-fetch');
const { KretaAPI } = require("./api");
const { getNonce } = require("./nonce");

class KretaClient {
    constructor() {
        this.accessToken = undefined;
        this.refreshToken = undefined;
        this.idToken = undefined;
        this.userAgent = undefined;
    }

    async getAPI(url, headers = {}, { autoHeader = true, json = true, rawResponse = false } = {}) {
        if (rawResponse) json = false;

        try {
            let res;

            for (let i = 0; i < 3; i++) {
                if (autoHeader) {
                    if (!headers['authorization'] && this.accessToken) headers['authorization'] = `Bearer ${this.accessToken}`;
                    if (!headers['user-agent'] && this.userAgent) headers['user-agent'] = this.userAgent;
                }

                const finalUrl = UserSettings.corsProxy === '' ? url : (UserSettings.corsProxy + url);

                res = await fetch(finalUrl, {
                    method: 'GET',
                    headers: headers,
                });

                if (res.status == 401) {
                    await this.refreshLogin();
                    delete headers['authorization'];
                } else {
                    break;
                }

                this.sleep(500);
            }

            if (!res) throw "Auth error";

            if (json) {
                return res.json();
            } else if (rawResponse) {
                return res.body;
            } else {
                return res.text();
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error(`[reFilc-API]: KretaClient.getAPI (${url}) SyntaxError: ${error.message}`);
            } else {
                console.error(`[reFilc-API]: KretaClient.getAPI (${url}) UnknownException: ${error}`);
            }
        }
    }

    async postAPI(url, body, headers = {}, { autoHeader = true, json = true } = {}) {
        try {
            let res;

            for (let i = 0; i < 3; i++) {
                if (autoHeader) {
                    if (!headers['authorization'] && this.accessToken) headers['authorization'] = `Bearer ${this.accessToken}`;
                    if (!headers['user-agent'] && this.userAgent) headers['user-agent'] = this.userAgent;
                    if (!headers['content-type']) headers['content-type'] = 'application/json';
                }

                const finalUrl = UserSettings.corsProxy === '' ? url : (UserSettings.corsProxy + url);

                res = await fetch(finalUrl, {
                    method: 'POST',
                    headers: headers,
                    body: body,
                });

                if (res.status == 401 && !url.includes('/connect/token')) {
                    await this.refreshLogin();
                    delete headers['authorization'];
                } else {
                    break;
                }
            }

            if (!res) throw "Auth error";

            if (json) {
                return res.json();
            } else {
                return res.text();
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error(`[reFilc-API]: KretaClient.getAPI (${url}) SyntaxError: ${error.message}`);
            } else {
                console.error(`[reFilc-API]: KretaClient.getAPI (${url}) UnknownException: ${error}`);
            }
        }
    }

    async refreshLogin() {
        const user = await UserDB.currentUser();
        if (!user) return;

        const headers = new Map([
            ['content-type', 'application/x-www-form-urlencoded'],
        ]);

        const nonceString = await this.getAPI(KretaAPI.nonce, {}, { json: false });
        const nonce = getNonce(nonceString, '72687219753', 'bgeszc-ganz');

        const nonceHeaders = nonce.header();
        nonceHeaders.forEach((value, key) => {
            headers.set(key, value);
        });

        const loginBody = `userName=${user.username}&password=${user.password}&institute_code=${user.instituteCode}&client_id=${KretaAPI.clientId}&grant_type=password`;

        const loginRes = await this.postAPI(KretaAPI.login, loginBody, Object.fromEntries(headers), {});

        if (loginRes) {
            if (loginRes["access_token"]) this.accessToken = loginRes["access_token"];
            if (loginRes["refresh_token"]) this.refreshToken = loginRes["refresh_token"];

            const newUser = new LoginUser(
                user.id,
                user.username,
                user.password,
                user.instituteCode,
                user.student.name,
                user.student,
                '',
                '',
                loginRes["access_token"],
            );
            UserDB.deleteUser(user.id);
            UserDB.addUser(newUser);
        }
    }

    sleep(milliseconds) {
        const start = new Date().getTime();
        for (let i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }
}

module.exports = KretaClient;
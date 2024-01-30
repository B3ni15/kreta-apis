const https = require('https');
const axios = require('axios');
const crypto = require('crypto');

class Kreta {
    static base(ist) {
        return `https://${ist}.e-kreta.hu`;
    }
    static IDP = "https://idp.e-kreta.hu";
    static ADMIN = "https://eugyintezes.e-kreta.hu";
    static FILES = "https://files.e-kreta.hu";
}

class KretaEndpoints {
    static token = "/connect/token";
    static nonce = "/nonce";
    static notes = "/ellenorzo/V3/Sajat/Feljegyzesek";
    static events = "/ellenorzo/V3/Sajat/FaliujsagElemek";
    static student = "/ellenorzo/V3/Sajat/TanuloAdatlap";
    static evaluations = "/ellenorzo/V3/Sajat/Ertekelesek";
    static absences = "/ellenorzo/V3/Sajat/Mulasztasok";
    static groups = "/ellenorzo/V3/Sajat/OsztalyCsoportok";
    static classAverages = "/V3/Sajat/Ertekelesek/Atlagok/OsztalyAtlagok";
    static timetable = "/ellenorzo/V3/Sajat/OrarendElemek";
    static announcedTests = "/ellenorzo/V3/Sajat/BejelentettSzamonkeresek";
    static homeworks = "/ellenorzo/V3/Sajat/HaziFeladatok";
    static homeworkDone = "/ellenorzo/V3/Sajat/HaziFeladatok/Megoldva";
    static capabilities = "/ellenorzo/V3/Sajat/Intezmenyek";
}

class AdminEndpoints {
    static sendMessage = "/api/v1/kommunikacio/uzenetek";
    static getAllMessages(endpoint) {
        return `/api/v1/kommunikacio/postaladaelemek/${endpoint}`;
    }
    static getMessage(id) {
        return `/api/v1/kommunikacio/postaladaelemek/${id}`;
    }
    static recipientCategories = "/api/v1/adatszotarak/cimzetttipusok";
    static availableCategories = "/api/v1/kommunikacio/cimezhetotipusok";
    static recipientsTeacher = "/api/v1/kreta/alkalmazottak/tanar";
    static uploadAttachment = "/ideiglenesfajlok";
    static downloadAttachment(id) {
        return `/v1/dokumentumok/uzenetek/${id}`;
    }
    static trashMessage = "/api/v1/kommunikacio/postaladaelemek/kuka";
    static deleteMessage = "/api/v1/kommunikacio/postaladaelemek/torles";
}

class User {
    constructor(usr, pwd, ist, fromDate = null, toDate = null) {
        this.usr = usr;
        this.pwd = pwd;
        this.ist = ist;

        // userAgent and clientID
        this.userAgent = "hu.ekreta.student/1.0.5/Android/0/0";
        this.clientID = "kreta-ellenorzo-mobile-android";

        this.bearer = this.getToken();

        // headers used for operations other than token
        this.headers = {
            "Authorization": `Bearer ${this.bearer}`,
            "User-Agent": this.userAgent
        };
    }

    async getToken() {
        // gets access token
        // headers: special to token
        const key = Buffer.from([98, 97, 83, 115, 120, 79, 119, 108, 85, 49, 106, 77]);
        const nonce = (await axios.get(Kreta.IDP + KretaEndpoints.nonce)).data;
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

        // url: https://idp.e-kreta.hu/connect/token
        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                method: 'POST',
                hostname: 'idp.e-kreta.hu',
                path: '/connect/token',
                headers,
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ data, headers: res.headers });
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.abort();
                reject(new Error('Request Timeout'));
            });

            req.write(new URLSearchParams(data).toString());
            req.end();
        });

        try {
            return JSON.parse(response.data).access_token;
        } catch (error) {
            // occasionally it gives a 502 error
            return response.data;
        }
    }

    async getEvaluations() {
        // returns evaluations (technically has a from-to data optional parameter)
        // url: https://{ist}.ekreta.hu/ellenorzo/V3/Sajat/Ertekelesek
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.evaluations,
            { headers: this.headers }
        );
        const evaluations = response.data.sort((a, b) => new Date(b.KeszitesDatuma) - new Date(a.KeszitesDatuma));
        return evaluations;
    }

    async getAbsences() {
        // url: https://{ist}.ekreta.hu/ellenorzo/V3/Sajat/Mulasztasok
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.absences,
            { headers: this.headers }
        );
        return response.data;
    }

    async getTimetable(fromDate, toDate) {
        // returns array containing lessons from fromDate to toDate
        if (!fromDate || !toDate) {
            fromDate = "2020-09-01";
            toDate = "2020-09-08";
        }

        // url: https://{ist}.ekreta.hu/ellenorzo/V3/Sajat/OrarendElemek
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.timetable,
            {
                params: {
                    "datumTol": fromDate,
                    "datumIg": toDate
                },
                headers: this.headers
            }
        );
        return response.data;
    }

    async getApiLinks() {
        // not really needed for the class
        const response = await axios.get(
            "http://kretamobile.blob.core.windows.net/configuration/ConfigurationDescriptor.json"
        );
        return response.data;
    }

    async getMessages(typeOrId) {
        // url: https://eugyintezes.e-kreta.hu/api/v1/kommunikacio/postaladaelemek/{typeOrId}
        const response = await axios.get(
            Kreta.ADMIN + AdminEndpoints.getAllMessages(typeOrId),
            { headers: this.headers }
        );
        return response.data;
    }

    async getAnnounced(date = null) {
        // returns announced tests/exams
        const params = date ? { "datumTol": date } : null;
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.announcedTests,
            {
                headers: this.headers,
                params
            }
        );
        return response.data;
    }

    async getNotes(date = null) {
        // returns announced tests/exams
        const params = date ? { "datumTol": date } : null;
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.notes,
            {
                headers: this.headers,
                params
            }
        );
        return response.data;
    }

    async getInfo() {
        // returns info about the student
        const response = await axios.get(
            Kreta.base(this.ist) + KretaEndpoints.student,
            { headers: this.headers }
        );
        return response.data;
    }
}

// Example usage
(async () => {
    console.log(await new User('user', 'pass', 'ist').getInfo());
})();

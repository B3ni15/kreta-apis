const { createHmac } = require('crypto');

class Nonce {
    constructor(nonce, key) {
        this.nonce = nonce;
        this.key = key;
    }

    async encode(message) {
        const messageBytes = Buffer.from(message);
        const hmac = createHmac('sha512', this.key);
        const digest = hmac.update(messageBytes).digest();
        this.encoded = digest.toString('base64');
    }

    header() {
        return new Map([
            ['X-Authorizationpolicy-Nonce', this.nonce],
            ['X-Authorizationpolicy-Key', (this.encoded ?? '')],
            ['X-Authorizationpolicy-Version', 'v2'],
        ]);
    }
}

function getNonce(nonce, username, instituteCode) {
    const nonceEncoder = new Nonce(nonce, String.fromCharCode(98, 97, 83, 115, 120, 79, 119, 108, 85, 49, 106, 77));
    nonceEncoder.encode(instituteCode.toUpperCase() + nonce + username.toUpperCase());

    return nonceEncoder;
}

module.exports = { Nonce, getNonce };

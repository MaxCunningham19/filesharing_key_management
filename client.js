const crypto = require('crypto');
const { type } = require('os');
const cert = require('./cert')
const { publicKey, privateKey } = require('./keys').generateKeys()
const serverIP = 'http://localhost:3000'
const symKey = crypto.randomBytes(256)
console.log("symetric key:", symKey.toString('base64'))
getKey()

function getKey() {
    fetch(serverIP + '/key', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publicKey: publicKey })
    })
        .then(response => response.json())
        .then(response => {
            signup(response.publicKey)
        })
}

function signup(serverKey) {
    let encKey = crypto.publicEncrypt(serverKey, symKey).toString('base64')
    let certificate = cert.generateCertificate("max", "m@g.c", "IE", publicKey)
    let signature = createSignature(certificate,privateKey)
    let data = {
        cert: certificate,
        signature: signature,
        password: "myPassword"
    }
    let strData = JSON.stringify(data)
    let encData = symetricEncrypt(symKey,strData)
    fetch(serverIP + '/signup', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: encKey, data: encData })
    }).then(response => response.json()).then(res => console.log(res))
}

function createSignature(data, privateKey){
    let hash = crypto.createHash('sha256').update(data).digest('base64')
    let signature = crypto.privateEncrypt(privateKey, hash).toString('base64')
    return signature
}

function symetricEncrypt(symetricKey, data) {
    try {
        let cipher = crypto.createCipher('aes256', symetricKey)
        let encData = cipher.update(data, 'utf-8', 'base64') + cipher.final('base64')
        return encData
    } catch {

    }
}

function symerticDecrypt(symKey,encData){
    let decipher = crypto.createDecipher('aes256',Buffer.from(symKey,'base64'))
    let decData = decipher.update(encData,'base64','utf-8') + decipher.final('utf-8')
    return decData
}


function getEndpoint(endpoint, method, encData) {
    fetch(serverIP + endpoint, {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'data': encData })
    })
        .then(response => response.json())
        .then(response => console.log(JSON.stringify(response)))
}
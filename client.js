const crypto = require('crypto');
const { type } = require('os');
const cert = require('./cert')
const { publicKey, privateKey } = require('./keys').generateKeys()
const serverIP = 'http://localhost:3000'
const symKey = crypto.randomBytes(256)
console.log("symetric key:",symKey.toString('base64'))
getKey()

function getKey() {
    fetch(serverIP+'/key',{
        method:'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({ publicKey:publicKey})
    })
    .then(response => response.json())
   .then(response => {
    console.log(response);
    let encKey = crypto.publicEncrypt(response.publicKey,symKey).toString('base64')
    let certificate =cert.generateCertificate("max","m@g.c","IE",publicKey)
    console.log("cert:",certificate)
    let hash = crypto.createHash('sha256').update(certificate).digest('base64')
    console.log("\nhash:",hash)
    let signature = crypto.privateEncrypt(privateKey,hash).toString('base64')
    let data = {
        cert: certificate,
        signature: signature
    }
    let strData = JSON.stringify(data)
    console.log("before encoding:",strData)
    let cipher = crypto.createCipher('aes256',symKey)
    let encData = cipher.update(strData,'utf-8','base64') + cipher.final('base64')
    let decipher = crypto.createDecipher('aes256',symKey)
    let decData = decipher.update(encData,'base64','utf-8') + decipher.final('utf-8')
    console.log("\nencoded data:",encData.toString('base64'),typeof encData,"\n\ndecoded data:",decData)
    fetch(serverIP+'/valid',{
        method:'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({key: encKey, data:encData})}).then(response => response.json()) . then(res => console.log(res))
    }) 
} 

function symetricEncrypt(symetricKey, data){
    try{
        cipher = crypto.createCipher('aes256',symetricKey)
        message = cipher.update(data,'utf-8','base64') + cipher.final('base64')
        return message
    }catch{

    }
}

function encryptSecret(data){
    return crypto.privateEncrypt(privateKey,Buffer.from(data)).toString('base64')
}

function encrypt(data,serverKey){
    console.log(serverKey, typeof serverKey)
    encrypted = crypto.publicEncrypt(serverKey,Buffer.from(data)).toString('base64')
    return encrypted
}

function getEndpoint(endpoint,method,encData){
    fetch(serverIP+endpoint,{
        method:method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({ 'data': encData })
    })
    .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))
}
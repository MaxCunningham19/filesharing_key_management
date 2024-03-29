const crypto = require('crypto');
const express = require('express')
const app = express()
const fs = require('fs')
const cors = require('cors')
const fileUpload = require('express-fileupload')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
app.use(fileUpload())
const cert = require('./cert')
const keys = require('./keys');
const serverIP = 'http://localhost:3000'
const sessionDetails = { serverKey: "", users: [] }
//getKey()

async function getKey() {
    let { res, jsonRes } = await getEndpoint('/key', 'POST', {})
    return jsonRes.publicKey
}

async function signup(certificate, password, privateKey) {
    if (sessionDetails.serverKey === "") {
        sessionDetails.serverKey = await getKey()
    }
    let symKey = crypto.randomBytes(256)
    let encKey = crypto.publicEncrypt(sessionDetails.serverKey, symKey).toString('base64')
    let signature = createSignature(certificate, privateKey)
    let data = {
        cert: certificate,
        signature: signature,
        password: password
    }
    let strData = JSON.stringify(data)
    let encData = symetricEncrypt(symKey, strData)
    return { response, jsonRes } = await getEndpoint('/signup', 'POST', { key: encKey, data: encData })
}

async function login(certificate, password, privateKey, sessionID, sessionKey, uid) {
    if (sessionDetails.serverKey === "") {
        sessionDetails.serverKey = getKey()
    }
    let encKey = crypto.publicEncrypt(sessionDetails.serverKey, sessionKey).toString('base64')
    let signature = createSignature(certificate, privateKey)
    let data = {
        cert: certificate,
        signature: signature,
        password: password,
        uid
    }
    let strData = JSON.stringify(data)
    let encData = symetricEncrypt(sessionKey, strData)
    return { response, jsonRes } = await getEndpoint('/login', 'POST', { key: encKey, data: encData })
}

function createSignature(data, privateKey) {
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

function symetricDecrypt(symKey, encData) {
    let decipher = crypto.createDecipher('aes256', symKey)
    let decData = decipher.update(encData, 'base64', 'utf-8') + decipher.final('utf-8')
    return decData
}

function encryptFile(symKey, data){
    let cipher = crypto.createCipher('aes256', symKey)
    let encData = cipher.update(data, 'utf-8', 'base64') + cipher.final('base64')
    return encData
}

async function getEndpoint(endpoint, method, json) {
    let response = await fetch(serverIP + endpoint, {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(json)
    })
    let jsonRes = await response.json()
    return { response, jsonRes }
}

async function saveToFile(email, curDetails) {
    try {
        fs.writeFileSync(`${__dirname}/cmodels/${email}.json`, JSON.stringify(curDetails, undefined, 2))
    } catch (err) {
        console.log(err)
    }
}

function hash(string) {
    return crypto.createHash('sha256').update(string).digest('base64')
}

function saveUserData(uid, email, name, sessionID, sessionKey, publicKey, privateKey, certificate) {
    let saved = false;
    for (let i = 0; i < sessionDetails.users.length; i++) {
        if (sessionDetails.users[i].uid === uid && sessionDetails.users[i].email === email) {
            sessionDetails.users[i] = { uid, email, name, sessionID, sessionKey, publicKey, privateKey, certificate }
            saved = true
            break;
        }
    }
    if (!saved) { sessionDetails.users.push({ uid, email, name, sessionID, sessionKey, publicKey, privateKey, certificate }) }
    saveToFile(email, { uid, email, name, sessionID, sessionKey, publicKey, privateKey, certificate })
}

function getSession(uid) {
    for (let i = 0; i < sessionDetails.users.length; i++) {
        if (sessionDetails.users[i].uid === uid) {
            return { id: sessionDetails.users[i].sessionID, key: sessionDetails.users[i].sessionKey }
        }
    }
    return
}

function getUserData(email) {
    for (let i = 0; i < sessionDetails.users.length; i++) {
        if (sessionDetails.users[i].email === email) {
            return sessionDetails.users[i]
        }
    }
    try {
        if (fs.existsSync(`${__dirname}/users/${email}.json`)) {
            let details = JSON.parse(fs.readFileSync(`${__dirname}/users/${email}.json`, { encoding: "utf-8" }))
            return details
        }
    } catch { }
    return undefined
}

app.post('/signup', async (req, res) => {
    if (req.body.name === "" || req.body.name == undefined || !cert.isEmail(req.body.email) || req.body.country == undefined || req.body.country.length != 2 || req.body.pword === "") {
        return res.status(400).json({ error: "invalid inputs try again" })
    }
    details = getUserData(req.body.email)
    if (details !== undefined) {
        return res.status(404).json({ error: "account already exits for this email - login or use a different email" })
    }
    let { privateKey, publicKey } = keys.generateKeys()
    let certificate = cert.generateCertificate(req.body.name, req.body.email, req.body.country, publicKey)
    let { response, jsonRes } = await signup(certificate, hash(req.body.pword), privateKey)
    if (response.status !== 200) {
        return res.status(response.status).json({ error: jsonRes.error })
    }
    let sessionKey = crypto.privateDecrypt(privateKey, Buffer.from(jsonRes.sessionKey, 'base64')).toString('utf-8')
    let decData = symetricDecrypt(sessionKey, jsonRes.data)
    decData = JSON.parse(decData)
    saveUserData(decData.userID, req.body.email, req.body.name, decData.sessionID, sessionKey, publicKey, privateKey, certificate)
    res.json({ uid: decData.userID })
})

app.post('/login', async (req, res) => {
    if (!cert.isEmail(req.body.email) || req.body.pword === "") {
        return res.status(400).json({ error: "invalid inputs try again" })
    }
    details = getUserData(req.body.email)
    if (details === undefined) {
        return res.status(400).json({ error: "no account exists" })
    }

    let { response, jsonRes } = await login(details.certificate, hash(req.body.pword), details.privateKey, details.sessionID, details.sessionKey, details.uid)
    if (response.status !== 200) {
        return res.status(response.status).json({ error: jsonRes.error })
    }
    let sessionKey = crypto.privateDecrypt(details.privateKey, Buffer.from(jsonRes.sessionKey, 'base64')).toString('utf-8')
    let decData = JSON.parse(symetricDecrypt(sessionKey, jsonRes.data))
    saveUserData(decData.userID, req.body.email, decData.name, decData.sessionID, sessionKey, details.publicKey, details.privateKey, details.certificate)
    res.json({ uid: decData.userID, name: decData.name })
})

app.post('/users/:uid/groups', async (req, res) => {
    let session = getSession(req.body.uid)
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    let data = symetricEncrypt(session.key, JSON.stringify({ email: req.body.email }))
    let { response, jsonRes } = await getEndpoint(`/${req.body.uid}/groups`, 'POST', { data, sessionID: session.id })
    let decData = JSON.parse(symetricDecrypt(session.key, jsonRes.data))
    res.json(decData)
})

app.post('/groups', async (req, res) => {
    let session = getSession(req.body.uid)
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    let data = symetricEncrypt(session.key, JSON.stringify({ uid: req.body.uid, name: req.body.name, members: req.body.members, email: req.body.email }))
    let { response, jsonRes } = await getEndpoint(`/groups`, 'POST', { data, sessionID: session.id })
    let decData = JSON.parse(symetricDecrypt(session.key, jsonRes.data))
    res.json(decData)
})

app.post('/del/groups/:id/', async (req, res) => {
    let session = getSession(req.body.uid)
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    let data = symetricEncrypt(session.key, JSON.stringify({ id: req.body.id, uid: req.body.uid, email: req.body.email }))
    let { response, jsonRes } = await getEndpoint(`/del/groups/${req.body.id}`, 'POST', { data, sessionID: session.id })
    let decData = JSON.parse(symetricDecrypt(session.key, jsonRes.data))
    res.json(decData)
})

app.post('/put/groups/:id', async (req, res) => {
    let session = getSession(req.body.uid)
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    let data = symetricEncrypt(session.key, JSON.stringify({ id: req.body.group.id, group: req.body.group, uid: req.body.uid, email: req.body.email }))
    let { response, jsonRes } = await getEndpoint(`/groups/${req.body.id}`, 'PUT', { data, sessionID: session.id })
    let decData = JSON.parse(symetricDecrypt(session.key, jsonRes.data))
    res.json(decData)
})

app.post('/encrypt/:groupID/:uid', async (req, res) => {
    let session = getSession(parseInt(req.params.uid))
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    if (req.files && Object.keys(req.files).length !== 0) {
        let encFile = encryptFile(session.key,req.files.file.data)
        let encData = symetricEncrypt(session.key,JSON.stringify({email:req.body.email, uid:req.body.uid}))
        let { response, jsonRes } = await getEndpoint(`/encrypt/${req.body.groupID}`, 'POST', { file:encFile, data:encData, sessionID: session.id })
        let decData = symetricDecrypt(session.key, jsonRes.data)
        if (response.status!==200){
            return res.status(response.status).json(decData)
        }
        req.files.file.data = decData
        res.send(req.files.file)
    } else {
        res.json({error:"no file uploaded"})
    }
})

app.post('/decrypt/:groupID/:uid', async (req, res) => {
    let session = getSession(parseInt(req.params.uid))
    if (session === undefined) {
        return res.status(500).json({ error: "not signed in or session has expired" })
    }
    if (req.files && Object.keys(req.files).length !== 0) {
        let encFile = encryptFile(session.key,req.files.file.data)
        let encData = symetricEncrypt(session.key,JSON.stringify({email:req.body.email, uid:req.body.uid}))
        let { response, jsonRes } = await getEndpoint(`/decrypt/${req.body.groupID}`, 'POST', { file:encFile, data:encData, sessionID: session.id })
        let decData = symetricDecrypt(session.key, jsonRes.data)
        if (response.status!==200){
            return res.status(response.status).json(decData)
        }
        req.files.file.data = decData
        res.send(req.files.file)
    } else {
        res.json({error:"no file uploaded"})
    }
})




app.listen(3001, () => { console.log('client running on port 3001') })
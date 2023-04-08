const crypto = require('crypto');
const express = require('express')
const app = express()
const fs = require('fs')
const cors = require('cors')
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set("view engine", "ejs")
var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200 
  }
app.use(cors(corsOptions))
const cert = require('./cert')
const keys = require('./keys')
var {privateKey,publicKey} = keys.generateKeys() 
app.locals.privateKey = privateKey
app.locals.publicKey = publicKey
app.locals.certificate= "";
const serverIP = 'http://localhost:3000'
const symKey = crypto.randomBytes(256)
app.locals.sessionKey="";
app.locals.signedIn = false;
app.locals.user = {}
//getKey()

async function getKey() {
    let {res,jsonRes} = await getEndpoint('/key','POST',{})
    //console.log(res.body)
    // fetch(serverIP + '/key', {
    //     method: 'POST',
    //     headers: {
    //         'Accept': 'application/json',
    //         'Content-Type': 'application/json'
    //     },
    // })
    //     // .then(response => response.json())
    //     // .then(response => {
    //     //     signup(response.publicKey)
    //     // })
    return jsonRes.publicKey
}

async function signup(serverKey, certificate, password,privateKey) {
    //console.log(serverKey,certificate,password, privateKey)
    let encKey = crypto.publicEncrypt(serverKey, symKey).toString('base64')
    let signature = createSignature(certificate,privateKey)
    let data = {
        cert: certificate,
        signature: signature,
        password: password
    }
    let strData = JSON.stringify(data)
    let encData = symetricEncrypt(symKey,strData)
    return {response,jsonRes} = await getEndpoint('/signup','POST',{ key: encKey, data: encData })
    // fetch(serverIP + '/signup', {
    //     method: 'POST',
    //     headers: {
    //         'Accept': 'application/json',
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ key: encKey, data: encData })
    // }).then(response => response.json()).then(res => console.log(res))
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

async function save(certificate, publicKey, privateKey, userEmail){

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
    return {response,jsonRes}
}

app.get('/',(req,res)=>{
    res.render(`homepage`,{signedIn:app.locals.signedIn,user:app.locals.user})
})

app.get('/signup',(req,res)=>{
    res.render('signup')
})

app.post('/signup',async (req,res)=>{
    if(req.body.name === "" || req.body.name== undefined || !cert.isEmail(req.body.email) || req.body.country==undefined || req.body.country.length != 2 || req.body.pword === ""){
        return res.status(400).json({error: "invalid inputs try again"})
    }
    if (fs.existsSync(`${__dirname}/users/${req.body.email}/cert.json`)){
        return res.status(400).json({error: "account already exits for this email - login or use a different email"})
    }
    let serverKey = await getKey()
    app.locals.certificate = cert.generateCertificate(req.body.name,req.body.email,req.body.country,publicKey)
    let {response, jsonRes} = await signup(serverKey,app.locals.certificate,req.body.pword,app.locals.privateKey)
    if (response.status !== 200){
        return res.status(response.status).send("Can not signup due to errors: "+jsonRes.error)
    }
    app.locals.signedIn = true
    app.locals.user = {id:jsonRes.uid,name:req.body.name,groups:[]}
    
    res.redirect('/')
})

app.get('/login',(req,res)=>{
    res.render('login')
})

app.post('/signout',(req,res)=>{
    app.locals.signedIn = false
    app.locals.user = {}
    let {priKey, pubKey} = keys.generateKeys()
    app.locals.privateKey = priKey
    app.locals.pubKey = pubKey
    res.redirect('/')
})



app.listen(3001,()=>{console.log('client running on port 3001')})
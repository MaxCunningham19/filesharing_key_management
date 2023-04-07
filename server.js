const express = require('express')
const crypto = require('crypto')

var bodyParser = require('body-parser')
const app = express()
const Users = require('./models/users')
const Sessions = require('./models/sessions')
const Groups = require('./models/groups')
const { publicKey, privateKey } = require('./keys').generateKeys()
const cert = require('./cert')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// middleware
function decryptCert(req, res, next){
    console.log('decrypt cert')
    let symKey = ""
    let jsonData = {}
    try{
        symKey = crypto.privateDecrypt(privateKey,Buffer.from(req.body.key,'base64')).toString('base64')
    }catch(err){
        return res.status(500).json({error:"could not decrypt symetric key: "+err})
    }
    try{
        let decipher = crypto.createDecipher('aes256',Buffer.from(symKey,'base64'))
        let decData = decipher.update(req.body.data,'base64','utf-8') + decipher.final('utf-8')
        jsonData = JSON.parse(decData)
    }catch(err){
        return res.status(500).json({error:"could not decrypt cert and signature: "+err})
    }
    req.body.cert = jsonData.cert
    req.body.signature = jsonData.signature
    next();
}

// middleware
function validateCert(req, res, next) {
    console.log('validateCert')
    let jsonCert = cert.jsonCert(req.body.cert)
    console.log(jsonCert)
    let hash = crypto.createHash('sha256').update(req.body.cert).digest('base64')
    let signature = ""
    try{
        signature = crypto.publicDecrypt(jsonCert.publicKey,Buffer.from(req.body.signature,'base64')).toString('utf-8')
    }catch(err){
        return res.status(500).json({error:"could not decrypt signature: "+err})
    }
    if (hash !== signature){
        return res.status(400).json({error:"invalid cert: digital signature did not match"})
    }
    if (!cert.validCert(jsonCert, req.body.publicKey)) {
        return res.status(404).json({ error: "invalid cert: expired or data invalid" })
    }
    req.body.cert = jsonCert
    next();
}

function sessionDecrypt(req, res, next){
    next();
}


function createUser(userDetails, password) {
    let user = Users.get(userDetails.email, userDetails.publicKey)
    if (user !== undefined) {
        return {created:false,user}
    }
    userDetails.session = undefined
    user = Users.post(userDetails,password)
    return {created:true,user}
}

function createSession(session) {
    let user = Users.get(session.uid)
    if (user === undefined){
        return false
    }
    user.session = session
    Users.put(user)
    return true
}

function generateSession(user) {
    let date = new Date()
    date = date.setHours(date.getHours() + 1)
    let session = {
        key: crypto.randomBytes(256), // generate a session key
        uid: user.uid,
        id: crypto.randomBytes(64).toString('base64'),
        expires: date
    }
    let done = createSession(session)
    return {done,session}
}

// parse application/json
app.use(bodyParser.json())

app.post('/key', (req, res) => {
    console.log('key')
    res.json({ publicKey: publicKey})
})

app.post('/valid',decryptCert,validateCert,(req,res)=>{
    console.log('valid')
    res.json({msg:'Good CERT'})
})

app.post('/signup', decryptCert, validateCert, (req, res) => {
    let { created, user } = createUser(req.body.cert, req.body.password)
    if (!created) {
        return res.status(400).json({ error: "already have an account" })
    }
    let {done,session} = generateSession(user)
    if (!done){
        return res.status(500).json({ error: "failed to generate a session" })
    }
    let data = encryptPublic(req.body.cert.publicKey, JSON.stringify({ session, uid: user.uid }))
    if (data === undefined) {
        return res.status(500).json({ error: "failed encrypting data" })
    }
    res.json({ data: data })
})

app.post('/login', decryptCert, validateCert, (req, res) => {
    let session = generateSession(req.user)
    let data = encryptPublic(req.body.cert.publicKey, JSON.stringify({ session }))
    if (data === undefined) {
        return res.status(500).json({ error: "failed encrypting data" })
    }
    res.json({ data: data })
})

// get all users
app.get('/users', sessionDecrypt, (req, res) => {
    db.get_users()
})

// create a profile
app.post('/users', sessionDecrypt, (req, res) => {
    console.log(req.body)
    //res.json({msg:'Hello from SSL server'})
})

// update your profile
app.put('/users', sessionDecrypt, (req, res) => {

})

// delete your profile
app.delete('/users/:id', sessionDecrypt, (req, res) => {

})

// get all groups you are a part of
app.get('/groups', sessionDecrypt, (req, res) => {

})

// create a group
app.post('/groups', sessionDecrypt, (req, res) => {

})

// update a group (you must be the owner)
app.put('/groups/:id', sessionDecrypt, (req, res) => {

})

// delete a group (you must be the owner)
app.delete('/groups/:id', sessionDecrypt, (req, res) => {

})

// encrypt a file for a group you are a part of
app.post('/api/encrypt/:groupID',sessionDecrypt, (req, res) => {

})

// decrypt a file for a group you are a part of
app.post('/api/decrypt/:groupID', sessionDecrypt, (req, res) => {

})


// const sslServer = https.createServer(
//     {
//       key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//       cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
//     },
//     app
//   )
  
app.listen(3000, () => console.log('Secure server 🔑 on port 3000'))
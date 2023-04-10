const express = require('express')
const crypto = require('crypto')

var bodyParser = require('body-parser')
const app = express()
const Users = require('./models/users')
const Groups = require('./models/groups')
const { publicKey, privateKey } = require('./keys').generateKeys()
const cert = require('./cert')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// middleware
function decryptCert(req, res, next){
    let symKey = ""
    let jsonData = {}
    try{
        symKey = crypto.privateDecrypt(privateKey,Buffer.from(req.body.key,'base64')).toString('base64')
        symKey = Buffer.from(symKey,'base64'),toString('utf-8')
    }catch(err){
        return res.status(500).json({error:"could not decrypt symetric key: "+err})
    }
    try{
        let decData = symetricDecrypt(symKey,req.body.data)
        jsonData = JSON.parse(decData)
    }catch(err){
        return res.status(500).json({error:"could not decrypt cert and signature: "+err})
    }
    req.body= jsonData
    req.body.symetricKey = Buffer.from(symKey,'base64'),toString('utf-8')
    next();
}

// middleware
function validateCert(req, res, next) {
    let jsonCert = cert.jsonCert(req.body.cert)
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

function symetricDecrypt(symKey,encData){
    try{
    let decipher = crypto.createDecipher('aes256',symKey)
    let decData = decipher.update(encData,'base64','utf-8') + decipher.final('utf-8')
    return decData
    }catch(err){console.log("\nerror:",err)}
}

function symetricEncrypt(symKey, data) {
    try {
        let cipher = crypto.createCipher('aes256', symKey)
        let encData = cipher.update(data, 'utf-8', 'base64') + cipher.final('base64')
        return encData
    } catch{}
}

// middleware
function sessionDecrypt(req, res, next){
    let info = Users.getSession(req.body.sessionID)
    if (info===undefined){
        return res.status(400).json({error:"session does not exist"})
    }
    decData = JSON.parse(symetricDecrypt(info.session.key,req.body.data))
    req.body = decData
    req.body.session = info.session
    next();
}

function sessionFileDecrypt(req,res,next){
    let info = Users.getSession(req.body.sessionID)
    if (info===undefined){
        return res.status(400).json({error:"session does not exist"})
    }
    decData = JSON.parse(symetricDecrypt(info.session.key,req.body.data))
    decFile = symetricDecrypt(info.session.key,req.body.file)
    req.body = decData
    req.body.session = info.session
    req.body.file = decFile
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

function saveSession(session) {
    let user = Users.getID(session.uid)
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
        key: crypto.randomBytes(256).toString('base64'), // generate a session key
        uid: user.uid,
        id: crypto.randomBytes(64).toString('base64'),
        expires: date
    }
    let done = saveSession(session)
    return {done,session}
}

// parse application/json
app.use(bodyParser.json())

app.post('/key', (req, res) => {
    res.json({ publicKey: publicKey})
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
    let encKey = crypto.publicEncrypt(req.body.cert.publicKey,Buffer.from(session.key)).toString('base64')
    let data = symetricEncrypt(session.key, JSON.stringify({sessionID:session.id,userID:user.uid}))
    if (data === undefined) {
        return res.status(500).json({ error: "failed encrypting data" })
    }
    res.json({ sessionKey:encKey,data: data })
})

app.post('/login', decryptCert, validateCert, (req, res) => {
    let user = Users.getID(req.body.uid)
    // validate user
    if( user.password !== req.body.password || user.email!==req.body.cert.email){
        return res.status(404).json({error:"email or password is incorrect"})
    }
    let {done,session} = generateSession(user)
    if (!done){
        return res.status(500).json({ error: "failed to generate a session" })
    }
    let encKey = crypto.publicEncrypt(req.body.cert.publicKey,Buffer.from(session.key)).toString('base64')
    let data = symetricEncrypt(session.key, JSON.stringify({sessionID:session.id,userID:user.uid,name:user.name}))
    if (data === undefined) {
        return res.status(500).json({ error: "failed encrypting data" })
    }
    res.json({ sessionKey:encKey,data: data })
})


// get all groups you are a part of
app.post('/:uid/groups', sessionDecrypt, (req, res) => {
    let groups = Groups.get(req.body.session.uid,req.body.email)
    let data = symetricEncrypt(req.body.session.key,JSON.stringify({groups}))
    res.json({data})
})

// create a group
app.post('/groups', sessionDecrypt, (req, res) => {
    Groups.post(req.body.uid,req.body.name,req.body.members,crypto.randomBytes(256).toString('base64'))
    let groups = Groups.get(req.body.uid,req.body.email)
    let data = symetricEncrypt(req.body.session.key,JSON.stringify({groups}))
    res.json({data})
})

// update a group (you must be the owner)
app.put('/groups/:id', sessionDecrypt, (req, res) => {
    let groups = Groups.put(req.body.group,req.body.uid,req.body.email)
    let data = symetricEncrypt(req.body.session.key,JSON.stringify({groups}))
    res.json({data})
})

// delete a group (you must be the owner)
app.post('/del/groups/:id', sessionDecrypt, (req, res) => {
    let groups = Groups.del(req.body.id,req.body.uid,req.body.email)
    let data = symetricEncrypt(req.body.session.key,JSON.stringify({groups}))
    res.json({data})
})

// encrypt a file for a group you are a part of
app.post('/encrypt/:groupID',sessionFileDecrypt, (req, res) => {
    let groupKey = Groups.getKey(parseInt(req.params.groupID),req.body.uid,req.body.email)
    let encFile = symetricEncrypt(groupKey,req.body.file)
    let decFile = symetricDecrypt(groupKey,encFile)
    let data = symetricEncrypt(req.body.session.key,encFile)
    res.json({data})
})

// decrypt a file for a group you are a part of
app.post('/decrypt/:groupID',sessionFileDecrypt, (req, res) => {
    let groupKey = Groups.getKey(parseInt(req.params.groupID),req.body.uid,req.body.email)
    let decFile = symetricDecrypt(groupKey,req.body.file)
    let data = symetricEncrypt(req.body.session.key,decFile)
    res.json({data})
})



// const sslServer = https.createServer(
//     {
//       key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//       cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
//     },
//     app
//   )
  
app.listen(3000, () => console.log('Secure server 🔑 on port 3000'))
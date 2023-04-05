const express = require('express')
const crypto = require('crypto')
var bodyParser = require('body-parser')
const app = express()
const db = require('./db')
const {publicKey, privateKey} = require('./keys')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

function decryptData(req, res, next){

    let encData = req.body.data
    try{
        console.log("encData:",encData,'\n',Buffer.from(encData))
        let decryptedData = crypto.privateDecrypt(privateKey,Buffer.from(encData,'base64')).toString('utf-8')
        console.log("decData:",decryptedData)
        jsonData = JSON.parse(decryptedData)
        console.log(jsonData)
        req.body = jsonData
    }catch(err){
        console.log(err)
        return res.status(500).json({error:err})
    }
    next();
}

function validateUser(req, res, next){
    if (! valid_cert(req.body.user.cert, req.body.user.publicKey)){
        return res.sendStatus(404).json({error:"invalid cert"})
    }
    userID = db.get_user(req.body.user.publicKey)
}

// parse application/json
app.use(bodyParser.json())

app.get('/key',(req,res)=>{
    res.json({publicKey:publicKey})
})

app.get('/',decryptData, (req, res) => {
    console.log(req.body)
    res.json({msg:'Hello from SSL server'})
})

// get all users
app.get('/users',decryptData,(req,res)=>{
    db.get_users()
})

// create a profile
app.post('/users',decryptData,(req,res)=>{
    console.log(req.body)
    //res.json({msg:'Hello from SSL server'})
})

// update your profile
app.put('/users',(req,res)=>{

})

// delete your profile
app.delete('/users/:id',(req,res)=>{

})

// get all groups you are a part of
app.get('/groups',(req,res)=>{

})

// create a group
app.post('/groups',(req,res)=>{

})

// update a group (you must be the owner)
app.put('/groups/:id',(req,res)=>{

})

// delete a group (you must be the owner)
app.delete('/groups/:id',(req,res)=>{

})

// encrypt a file for a group you are a part of
app.post('/api/encrypt/:groupID',(req,res)=>{

})

// decrypt a file for a group you are a part of
app.post('/api/decrypt/:groupID',(req,res)=>{
    
})

app.listen(3000, () => console.log('Secure server on port 3000'))
const crypto = require('crypto');
const e = require('express');
const { get } = require('https');
const { buffer } = require('stream/consumers');
const { privateKey } = require('./keys');

function getKey(){
    fetch("http://localhost:3000/key")
  .then((response) => response.json())
  .then((json) => {console.log(json); getHome(json.publicKey)});
}

let serverKey = getKey()

function encrypt(data, serverKey){

    encrypted = crypto.publicEncrypt(serverKey,Buffer.from(data)).toString('base64')
    console.log('buffer:',Buffer.from(data), "\nserverKey:",serverKey, "\n enc:",encrypted,"\nencBuffer:",Buffer.from(encrypted))
    return encrypted
}

function getHome(serverKey,privKey){
    fetch('http://localhost:3000/users',{
        method:'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        //body:{data:encrypt(JSON.stringify({ "id": 78912 }),serverKey)}
        body:JSON.stringify({ "data": encrypt(JSON.stringify({"user":"max cunningham"}),serverKey) })
    })
    .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))
}
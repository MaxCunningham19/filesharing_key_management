const { generateKeyPairSync } = require('crypto');


function generateKeys(){
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 4096, // the length of your key in bits
        publicKeyEncoding: {
          type: 'spki', // recommended to be 'spki' by the Node.js docs
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8', // recommended to be 'pkcs8' by the Node.js docs
          format: 'pem',
      
        },
      });
      return { privateKey, publicKey }
}


module.exports = {
    generateKeys
}
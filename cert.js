function generateCertificate(name,email,countryCode,publicKey){
    if (name === '' || email === '' || countryCode.length != 2 || publicKey === ''){
        return null
    }
    let date = new Date()
    date = date.setFullYear(date.getFullYear()+1)
    certificate = {
        name: name,
        email: email,
        country: countryCode,
        publicKey:publicKey,
        expires: date
    }
    return stringCert(certificate)
}

function stringCert(cert){
    return cert.name +'_'+ cert.email +'_'+ cert.country +'_'+ cert.publicKey +'_'+ cert.expires.toString(10)
}

function jsonCert(stringCert){
    cert = stringCert.split('_')
    certificate = {
        name: cert[0],
        email: cert[1],
        country: cert[2],
        publicKey:cert[3],
        expires: parseInt(cert[4])
    }
    return certificate
}

function isEmail(email) {
    if (email === undefined){
        return false
    }
    let whitespace = email.split(' ').length !== 0
    let dot = email.split('.').length > 1
    let at = email.split('@').length === 2
  
    return whitespace && dot && at
  }

function validCert(cert){
    return cert.name !== '' && cert.name !== undefined && isEmail(cert.email) && cert.country.length == 2 && cert.publicKey !== '' && Date.now() < cert.expires
}

module.exports = {
    generateCertificate,
    validCert, 
    jsonCert, isEmail
}
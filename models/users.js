var usersdb = []

function equal(user1,user2){
    return (user1.uid == user2.uid) || (user1.email == user2.email && user1.publicKey == user2.publicKey)
}

function get(email, publicKey){
    for(let i=0;i<usersdb.length;i++){
        if (usersdb[i].email===email && usersdb[i].publicKey===publicKey){
            return usersdb[i]
        }
    }
    return undefined
}

function get(uid){
    for(let i=0;i<usersdb.length;i++){
        if (usersdb[i].uid===uid){
            return usersdb[i]
        }
    }
    return undefined
}

function post(userDetails,password){
    userDetails.password = password
    userDetails.uid = 0
    if (usersdb.length>0){
    userDetails.uid = usersdb[usersdb.length-1].uid + 1
    }
    usersdb.push(userDetails)
    return usersdb[usersdb.length-1]
}

function put(user){
    for(let i=0;i<usersdb.length;i++){
        if (equal(usersdb[i],user)){
            usersdb[i] = user
        }
    }
}

function getSession(sessionID){
    for(let i=0;i<usersdb.length;i++){
        if (usersdb[i].session !== undefined && usersdb[i].session.id === sessionID){
            return usersdb.session
        }
    }
}

module.exports = {
    get,
    post,
    put, getSession
}
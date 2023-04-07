var sessionsdb = []

function post(session){
    sessionsdb.push(session)
}

function del(sessionID){
    for(let i=0;i<sessionsdb.length;i++){
        if (sessionsdb[i].id === sessionID){
            sessionsdb.splice(i,i)
        }
    }
    return undefined
}

function get(sessionID){
    for(let i=0;i<sessionsdb.length;i++){
        if (sessionsdb[i].id === sessionID){
            return sessionsdb[i]
        }
    }
}

module.exports = {
    post,get,del
}
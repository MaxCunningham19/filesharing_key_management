var groupdb = []

function isMember(members,email){
    for(let i=0;i<members.length;i++){
        if (members[i]===email){
            return true
        }
    }
    return false
}

function get(uid,email){
    let tmp = []
    for(let i=0;i<groupdb.length;i++){
        if (groupdb[i].ownerID === uid || isMember(groupdb[i].members,email)){
            tmp.push({id:groupdb[i].id,name:groupdb[i].name,members:groupdb[i].members})
        }
    }
    return tmp.length>0?tmp:undefined
}

function getKey(id,user){
    for(let i=0;i<groupdb.length;i++){
        if (groupdb[i].ownerID === user || isMember(groupdb[i].members,user) ){
            return groupdb[i].key
        }
    }
}

function post(ownerid,name,members,groupKey){
    groupdb.push({
        name,
        owner:ownerid,
        members,
        key:groupKey,
        id: groupdb[groupdb.length-1].id+1
    })
}

module.exports = {get,post}
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
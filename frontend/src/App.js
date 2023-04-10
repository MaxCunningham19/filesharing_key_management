import './App.css';
import { useState, useEffect } from 'react'

import axios from 'axios'

const server = 'http://localhost:3001'

function isEmail(email) {
  let whitespace = email.split(' ').length !== 0
  let dot = email.split('.').length > 1
  let at = email.split('@').length === 2

  return whitespace && dot && at
}


function App() {
  const [user, setUser] = useState('');
  const [signedIn, signIn] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>FileShare {signedIn ? ' - ' + user.name : ''}</h1>
        {signedIn ? <Homepage user={user} /> : <User setUser={setUser} signIn={signIn} />}
      </header>
    </div>
  );
}


function User(values) {
  const [signup, setSign] = useState(true)

  return (
    <div>
      <button onClick={() => { setSign(true) }}>Signup</button>
      <button onClick={() => { setSign(false) }}>Login</button>
      {signup ?
        <Signup setUser={values.setUser} signIn={values.signIn} /> : <Login setUser={values.setUser} signIn={values.signIn} />}
    </div>
  )
}

function Signup(values) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('IE')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirm] = useState('')
  return (
    <div>
      <label for="name">User Name:</label>
      <input type="text" id="name" name="name" autocomplete="off" onChange={(event) => { setName(event.target.value) }} /><br />
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" autocomplete="off" onChange={(event) => { setEmail(event.target.value) }} /><br />
      <label for="country">Country:</label>
      <select id="country" name="country" autocomplete="off" onChange={(event) => { setCountry(event.target.value) }}>
        <option value="IE">Ireland</option>
        <option value="UK">United Kingdom</option>
        <option value="ES">Spain</option>
        <option value="PT">Portugal</option>
        <option value="FR">France</option>
      </select><br />
      <label for="pword">Password:</label>
      <input type="text" id="pword" name="pword" autocomplete="off" onChange={(event) => { setPassword(event.target.value) }} /><br />
      <label for="cpword">Confirm Password:</label>
      <input type="text" id="cpword" name="cpword" autocomplete="off" onChange={(event) => { setConfirm(event.target.value) }} /><br />
      <button onClick={() => {
        if (name === '') {
          alert('please input a correct name')
        } else if (!isEmail(email)) {
          alert('please input a correct email address')
        } else if (password === '') {
          alert('please input a password')
        } else if (password !== confirmPass) {
          alert('passwords do not match')
        } else {
          axios.post(server + '/signup', { name, email, country, pword: password }).then(
            res => {
              values.setUser({ uid: res.data.uid, name: name, email: email })
              values.signIn(true)
            }
          )
        }
      }}>Signup</button>
    </div>
  )
}

function Login(values) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (<div>
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" autocomplete="off" onChange={(event) => { setEmail(event.target.value) }} /><br />
    <label for="pword">Password:</label>
    <input type="text" id="pword" name="pword" autocomplete="off" onChange={(event) => { setPassword(event.target.value) }} /><br />
    <button onClick={() => {
      if (!isEmail(email)) {
        alert('please input a correct email address')
      } else if (password === '') {
        alert('please input a password')
      } else {
        axios.post(server + '/login', { email, pword: password }).then(
          res => {
            values.setUser({ uid: res.data.uid, name: res.data.name, email: email })
            values.signIn(true)
          }
        )
      }
    }}>Login</button>
  </div>)
}

function Homepage({user}) {
  const [load, setLoad] = useState(true)
  const [groups, setGroups] = useState([])
  function loadGroups(uid, email) {
    if (load) {
      axios.post(server + `/users/${uid}/groups`, { uid, email }).then(res => {
        if (res.data.groups !== undefined && res.data.groups.length > 0) {
          setGroups(res.data.groups)
        }
        setLoad(false)
      })
    }
  }
  loadGroups(user.uid,user.email)
  return (
    <div>
      <div>
        <button className='refresh' onClick={() => {setLoad(true); loadGroups(user.uid, user.email) }}>Refresh</button>
      </div><br></br>
      <GroupList user={user} groups={groups} setGroups={setGroups} loadGroups={loadGroups} />
    </div>
  )
}



function GroupList(inputs) {
  return (<>
    <div>
      {inputs.groups.length > 0 ? inputs.groups.map(group => { return <Group group={group} user={inputs.user} loadGroups={inputs.loadGroups} setGroups={inputs.setGroups} /> }) : <></>}
      <GroupForm user={inputs.user} setLoad={inputs.setLoad} setGroups={inputs.setGroups} />
    </div></>)
}

function Group(info) {
  const [state, setState] = useState('norm')

  async function deleteGroup() {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("Are you sure?\nDeleting this group will mean all previously encoded files canot be decoded")) {
      axios.post(server + `/del/groups/${info.group.id}/`, { id: info.group.id, uid: info.user.uid, email: info.user.email })
        .then(res => {
          if (res.data.groups !== undefined && res.data.groups.length > 0) {
            info.setGroups(res.data.groups)
          } else {
            info.setGroups([])
          }
        })
    }
  }
  return (
    <div className='group'>
      <div className='display'>
        <p>{info.group.name} </p>
        <div className='buttons'>
          <button className='standard' onClick={() => { if (state === 'encr') { setState('norm') } else { setState('encr') } }}>encrypt</button>
          <button className='standard' onClick={() => { if (state === 'decr') { setState('norm') } else { setState('decr') } }}>decrypt</button>
          {info.group.owner ? <><button className='standard' onClick={() => { if (state === 'edit') { setState('norm') } else { setState('edit') } }}>edit</button>
            <button className='delete' onClick={() => { deleteGroup(); }}>delete</button></> : <></>
          }
        </div>
      </div>
      <Extras state={state} setState={setState} group={info.group} user={info.user} setGroups={info.setGroups}/>
    </div>
  )
}

function Extras({ state, setState, group, setGroups, user }) {
  const [memberList, setList] = useState(group.members)
  const [curMember, setCurMember] = useState('')
  const [file, setFile] = useState(null)

  function delMem(member) {
    let tmp = []
    let removed = false
    for (let i = memberList.length - 1; i >= 0; i--) {
      tmp.push(memberList[i])
      if (memberList[i] === member && !removed) {
        removed = true
        tmp.pop()
      }
    }
    setList(tmp)
  }

  async function editGroup(group, memberList) {
    axios.post(server + `/put/groups/${group.id}/`, { group: {id:group.id,name:group.name,members:memberList}, uid: user.uid, email: user.email })
        .then(res => {
          if (res.data.groups !== undefined && res.data.groups.length > 0) {
            setGroups(res.data.groups)
          } else {
            setGroups([])
          }
        })
  }

  function onFileChange(event) {
    // Update the state 
    setFile(event.target.files[0]);
  };


  async function onFileEncrypt(event) {
    // Create an object of formData 

    // Details of the uploaded file 
    // console.log(await file.text()); 
    //const enc_file = new Blob(await file.text(), {type: 'text/plain'});
    let formData = new FormData();
    formData.append("file",file)
    axios.post(`${server}/encrypt/${group.id}/${user.uid}`,formData,{
      headers: {
        "Content-Type":"multipart/form-data"
      }
    }).then(
      res =>{
        const element = document.createElement("a");
        element.href = URL.createObjectURL(new Blob([res.data.data],{type:"text/plain"}));
        element.download = Date.now() + "_enc_" + file.name;
        // simulate link click
        document.body.appendChild(element);
        element.click();
      }
    )
    // // anchor link
    // const element = document.createElement("a");
    // element.href = URL.createObjectURL(retFile);
    // element.download = Date.now() + "_enc_" + file.name;
    // // simulate link click
    // document.body.appendChild(element);
    // element.click();
  }

  async function onFileDecrypt(event) {
    // Create an object of formData 

    // Details of the uploaded file 
    //console.log(await file.text()); 

    //const enc_file = new Blob(encrypt(file), {type: 'text/plain'});
    // anchor link
    let formData = new FormData();
    formData.append("file",file)
    axios.post(`${server}/decrypt/${group.id}/${user.uid}`,formData,{
      headers: {
        "Content-Type":"multipart/form-data"
      }
    }).then(
      res =>{
        const element = document.createElement("a");
        element.href = URL.createObjectURL(new Blob([res.data.data],{type:"text/plain"}));
        element.download = Date.now() + "_dec_" + file.name;
        // simulate link click
        document.body.appendChild(element);
        element.click();
      }
    )
  }




  if (state === 'edit') {
    return (<>
      <div className='member-list'>
        {memberList.map(member => { return (<div className='mem-list-item'><p className='member'>{member}</p><button className='x' onClick={() => { delMem(member) }}>x</button></div>) })}
      </div>
      <div className='add-member'>
        <input type='email' id="name" name="name" onChange={(event) => { setCurMember(event.target.value) }} value={curMember}></input>
        <button className='standard' onClick={() => {
          if (isEmail(curMember)) {
            setList(memberList.concat([curMember]))
            setCurMember('')
          } else {
            alert('Only valid email addresses are allowed')
          }
        }}>Add Member</button>
      </div>
      <button className='standard' onClick={() => { editGroup(group, memberList); setState('norm') }}>Save Edit</button>
    </>
    )
  }
  if (state === 'encr') {
    return (<>
      <input type='file' onChange={onFileChange}></input>
      <button className='standard' onClick={onFileEncrypt}>Encrypt File</button>
    </>)
  }
  if (state === 'decr') {
    return (<>
      <input type='file' onChange={onFileChange}></input>
      <button className='standard' onClick={onFileDecrypt}>Decrypt File</button>
    </>)
  }
  return <></>
}

function GroupForm(info) {
  const [memberList, setList] = useState([])
  const [curMember, setCurMember] = useState('')
  const [groupName, setGroupName] = useState('')


  async function createGroup() {
    if (groupName !== '') {
      axios.post(server + `/groups`, { name: groupName, members: memberList, uid: info.user.uid, email: info.user.email }).then(res => {
        info.setGroups(res.data.groups)
        resetForm()
      })
    }
  }

  function resetForm() {
    setList([])
    setCurMember('')
    setGroupName('')
  }

  function groupNameEvent(event) {
    setGroupName(event.target.value)
  }

  function delMem(member) {
    let tmp = []
    let removed = false
    for (let i = memberList.length - 1; i >= 0; i--) {
      tmp.push(memberList[i])
      if (memberList[i] === member && !removed) {
        removed = true
        tmp.pop()
      }
    }
    setList(tmp)
  }

  return (
    <div className='group'>
      <p>New Group</p>
      <div>
        <label>Group Name</label>
        <input type='text' id="name" name="name" value={groupName} onChange={groupNameEvent}></input>
      </div>
      <label>Enter the users Email</label>
      <div className='add-member'>
        <input type='email' id="name" name="name" onChange={(event) => { setCurMember(event.target.value) }} value={curMember}></input>
        <button className='standard' onClick={(event) => {
          if (isEmail(curMember)) {
            setList(memberList.concat([curMember]))
            setCurMember('')
          } else {
            alert('Only valid email addresses are allowed')
          }
        }}>Add Member</button>
      </div>
      <div className='member-list'>
        {memberList.map(member => { return (<div className='mem-list-item'><p className='member'>{member}</p><button className='x' onClick={() => { delMem(member) }}>x</button></div>) })}
      </div>
      <div className='buttons'>
        <button type='submit' className='standard' onClick={(event) => { createGroup() }}>Create Group</button>
      </div>
    </div>
  )
}

export default App;
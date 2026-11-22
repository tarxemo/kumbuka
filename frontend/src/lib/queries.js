// GraphQL documents used across the app.

export const TASK_FIELDS = `
  id title description status statusLabel priority priorityLabel dueDate pinned isOpen
  completedAt createdAt updatedAt
  people { id name initials }
  requestedBy { id name initials }
  project { id name color }
  discussion { id title }
  subtasks { id title done }
  links { id }
`

export const TASK_DETAIL = `
  id title description status statusLabel priority priorityLabel dueDate pinned isOpen
  completedAt createdAt updatedAt
  people { id name initials role }
  requestedBy { id name initials role }
  project { id name color }
  discussion { id title occurredAt }
  subtasks { id title done position }
  links { id title url createdAt }
  activities { id kind message createdAt }
`

export const USER_FIELDS = `id email fullName jobTitle initials dateJoined`

export const ME = `query { me { ${USER_FIELDS} } }`

export const LOGIN = `mutation($email:String!,$password:String!){ login(email:$email,password:$password){ token user { ${USER_FIELDS} } } }`

export const REGISTER = `mutation($fullName:String!,$email:String!,$password:String!,$jobTitle:String){
  register(fullName:$fullName,email:$email,password:$password,jobTitle:$jobTitle){ token user { ${USER_FIELDS} } } }`

export const LOGOUT = `mutation { logout { ok } }`

export const DASHBOARD = `query($today:Date){ dashboard(today:$today){
  today openCount doneThisWeek doneToday inboxCount noDueDateCount
  focus { ${TASK_FIELDS} }
  overdue { ${TASK_FIELDS} }
  dueToday { ${TASK_FIELDS} }
  upcoming { ${TASK_FIELDS} }
  inProgress { ${TASK_FIELDS} }
  waiting { ${TASK_FIELDS} }
  recentDiscussions { id title kind kindLabel occurredAt rawCaptureCount participants { id name initials } }
} }`

export const TASKS = `query($status:String,$priority:String,$personId:ID,$projectId:ID,$discussionId:ID,$due:String,$search:String,$today:Date,$limit:Int){
  tasks(status:$status,priority:$priority,personId:$personId,projectId:$projectId,discussionId:$discussionId,due:$due,search:$search,today:$today,limit:$limit){ ${TASK_FIELDS} } }`

export const TASK = `query($id:ID!){ task(id:$id){ ${TASK_DETAIL} } }`

export const CREATE_TASK = `mutation($input:TaskInput!){ createTask(input:$input){ id title } }`
export const UPDATE_TASK = `mutation($id:ID!,$input:TaskInput!){ updateTask(id:$id,input:$input){ ${TASK_DETAIL} } }`
export const SET_STATUS = `mutation($id:ID!,$status:String!){ setTaskStatus(id:$id,status:$status){ id status statusLabel isOpen completedAt pinned } }`
export const TOGGLE_PIN = `mutation($id:ID!){ toggleTaskPin(id:$id){ id pinned } }`
export const DELETE_TASK = `mutation($id:ID!){ deleteTask(id:$id){ ok } }`
export const ADD_NOTE = `mutation($taskId:ID!,$message:String!){ addTaskNote(taskId:$taskId,message:$message){ id } }`
export const DELETE_ACTIVITY = `mutation($id:ID!){ deleteActivity(id:$id){ ok } }`
export const ADD_SUBTASK = `mutation($taskId:ID!,$title:String!){ addSubtask(taskId:$taskId,title:$title){ id } }`
export const UPDATE_SUBTASK = `mutation($id:ID!,$title:String,$done:Boolean){ updateSubtask(id:$id,title:$title,done:$done){ id done title } }`
export const DELETE_SUBTASK = `mutation($id:ID!){ deleteSubtask(id:$id){ ok } }`
export const ADD_LINK = `mutation($url:String!,$title:String,$taskId:ID,$discussionId:ID){ addLink(url:$url,title:$title,taskId:$taskId,discussionId:$discussionId){ id } }`
export const DELETE_LINK = `mutation($id:ID!){ deleteLink(id:$id){ ok } }`

export const PEOPLE = `query($search:String,$limit:Int){ people(search:$search,limit:$limit){ id name initials role organization email phone openTaskCount } }`
export const PERSON = `query($id:ID!){ person(id:$id){ id name initials email phone role organization notes createdAt openTaskCount
  openTasks { ${TASK_FIELDS} }
  requestedOpenTasks { ${TASK_FIELDS} }
  doneTasks { ${TASK_FIELDS} }
  recentDiscussions { id title kindLabel occurredAt }
} }`
/** Everything @ / # autocomplete needs, in one request (cached in lib/mentions.js). */
export const MENTIONABLES = `query{ people { id name initials role organization } projects { id name color } }`
export const GET_OR_CREATE_PERSON = `mutation($name:String!){ getOrCreatePerson(name:$name){ id name initials role } }`
export const CREATE_PERSON = `mutation($input:PersonInput!){ createPerson(input:$input){ id name } }`
export const UPDATE_PERSON = `mutation($id:ID!,$input:PersonInput!){ updatePerson(id:$id,input:$input){ id name } }`
export const DELETE_PERSON = `mutation($id:ID!){ deletePerson(id:$id){ ok } }`

export const PROJECTS = `query($includeArchived:Boolean){ projects(includeArchived:$includeArchived){ id name description color archived openTaskCount doneTaskCount } }`
export const CREATE_PROJECT = `mutation($input:ProjectInput!){ createProject(input:$input){ id name color } }`
export const UPDATE_PROJECT = `mutation($id:ID!,$input:ProjectInput!){ updateProject(id:$id,input:$input){ id name color archived } }`
export const DELETE_PROJECT = `mutation($id:ID!){ deleteProject(id:$id){ ok } }`

export const DISCUSSIONS = `query($search:String,$projectId:ID,$personId:ID,$limit:Int){
  discussions(search:$search,projectId:$projectId,personId:$personId,limit:$limit){
    id title kind kindLabel occurredAt rawCaptureCount openTaskCount summary
    participants { id name initials } project { id name color } } }`

export const DISCUSSION = `query($id:ID!){ discussion(id:$id){
  id title kind kindLabel occurredAt roughNotes summary createdAt updatedAt
  participants { id name initials role }
  project { id name color }
  captures { id text state createdAt task { id title } }
  tasks { ${TASK_FIELDS} }
  links { id title url }
} }`
export const CREATE_DISCUSSION = `mutation($input:DiscussionInput!){ createDiscussion(input:$input){ id } }`
export const UPDATE_DISCUSSION = `mutation($id:ID!,$input:DiscussionInput!){ updateDiscussion(id:$id,input:$input){ id } }`
export const SAVE_NOTES = `mutation($id:ID!,$roughNotes:String!){ saveRoughNotes(id:$id,roughNotes:$roughNotes){ id updatedAt } }`
export const DELETE_DISCUSSION = `mutation($id:ID!){ deleteDiscussion(id:$id){ ok } }`
export const EXTRACT_ACTIONS = `mutation($discussionId:ID!){ extractActions(discussionId:$discussionId){ created } }`

export const CAPTURES = `query($state:String,$discussionId:ID,$standalone:Boolean){
  captures(state:$state,discussionId:$discussionId,standalone:$standalone){
    id text state createdAt processedAt discussion { id title } task { id title status } } }`
export const INBOX_COUNT = `query{ captures(state:"raw"){ id } }`
export const ADD_CAPTURE = `mutation($text:String!,$discussionId:ID){ addCapture(text:$text,discussionId:$discussionId){ id } }`
export const UPDATE_CAPTURE = `mutation($id:ID!,$text:String,$state:String){ updateCapture(id:$id,text:$text,state:$state){ id } }`
export const DELETE_CAPTURE = `mutation($id:ID!){ deleteCapture(id:$id){ ok } }`
export const CONVERT_CAPTURE = `mutation($id:ID!,$input:TaskInput!){ convertCapture(id:$id,input:$input){ id title } }`

export const SEARCH = `query($q:String!){ search(q:$q){
  tasks { id title status dueDate project { name color } }
  people { id name initials role }
  discussions { id title occurredAt kindLabel }
  captures { id text }
  projects { id name color }
} }`

export const UPDATE_PROFILE = `mutation($fullName:String!,$jobTitle:String){ updateProfile(fullName:$fullName,jobTitle:$jobTitle){ ${USER_FIELDS} } }`
export const CHANGE_PASSWORD = `mutation($currentPassword:String!,$newPassword:String!){ changePassword(currentPassword:$currentPassword,newPassword:$newPassword){ ok } }`

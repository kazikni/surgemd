export type PlayArgs={
    type: "online"
    mode:string
    team_size:number
}|{
    type: "campaign"
    level:number
    charpter:number
}|{
    type: "join"
    url:string
    password:string
    attempts?:number
    delay?:number
}
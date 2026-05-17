import { AudioEngine } from "../../client.ts";

export interface SMIDNote {
    note:string
    position:number
    beat:number
    length:number
    velocity?:number
}
export interface SMIDTrack {
    instrument:string
    notes:SMIDNote[]
    //effects?:SMIDEffects
}
export interface SMIDInstrument{
    sample:string
    root_note:string
    adsr?:{
        attack:number
        decay:number
        sustain:number
        release:number
    }
    //effects?:SMIDEffects
}
export interface SMIDSong {
    bpm:number
    tracks:SMIDTrack[]
    instruments:Record<string,SMIDInstrument>
}
const NOTE_MAP:Record<string,number>={
    C:0,
    "C#":1,
    D:2,
    "D#":3,
    E:4,
    F:5,
    "F#":6,
    G:7,
    "G#":8,
    A:9,
    "A#":10,
    B:11
}
function note_to_midi(note:string):number{
    const match=note.match(/^([A-G]#?)(-?\d+)$/)
    if(!match){
        throw new Error(`Invalid note ${note}`)
    }
    const [key,octaveStr]=match
    const octave=parseInt(octaveStr)
    return NOTE_MAP[key]+((octave+1)*12)
}
function note_playback_rate(target:string,root:string):number{
    const targetMidi=note_to_midi(target)
    const rootMidi=note_to_midi(root)
    return Math.pow(2,(targetMidi-rootMidi)/12)
}
function get_song_duration(song:SMIDSong){
    let end=0
    for(const track of song.tracks){
        for(const note of track.notes){
            end=Math.max(
                end,
                note.position+
                note.length
            )
        }
    }
    return end
}
export class SMIDPlayer{
    constructor(audio:AudioEngine){
        
    }
    async render(song:SMIDSong){
        const beats=get_song_duration(song)
        const duration=beats*(60/song.bpm)
    }
}
import { GameItems } from "common/scripts/definitions/alldefs.ts";
import "../scss/main.scss"
import { BulletDef, GameItem, GameItemType } from "common/scripts/definitions/utils.ts";
import { GunClasses, GunDef } from "common/scripts/definitions/items/guns.ts";
const params = new URLSearchParams(self.location.search);

const item = params.get("item") || "m9"

const content={
    id:document.querySelector("#item-id") as HTMLSpanElement,
    name:document.querySelector("#item-name") as HTMLHeadingElement,
    infobox:document.querySelector("#infobox-table") as HTMLTableElement
}

const gunClasses:Record<GunClasses,string>={
    [GunClasses.Pistol]:"pistol",
    [GunClasses.Assault]:"burst",
    [GunClasses.SMG]:"smg",
    [GunClasses.DMR]:"dmr",
    [GunClasses.LMG]:"lmg",
    [GunClasses.Shotgun]:"shotgun",
    [GunClasses.Sniper]:"sniper",
    [GunClasses.Magic]:"magic",
}

function set_item(item:GameItem){
    if(item.item_type===GameItemType.gun){
        const gun=item as unknown as GunDef
        content.id.innerHTML=gun.idString
        content.name.innerHTML=gun.idString.toUpperCase()
        content.infobox.innerHTML=`
<tr>
    <th>Type</th>
    <td>${gunClasses[gun.class]}[${gun.class}]</td>
</tr>
<tr>
    <th>Ammo Type</th>
    <td>${gun.ammoType}</td>
</tr>

${gun.bullet?`
<tr>
    <th>Bullet Count</th>
    <td>${gun.bullet.count??1}</td>
</tr>
<tr>
    <th>Bullet Def</th>
    <td>${bullet_text(gun.bullet.def)}</td>
</tr>
`:""}
`
    }
}

function bullet_text(def:BulletDef):string{
    return `
<tr>
    <th>Damage</th>
    <td>${def.damage}</td>
</tr>
<tr>
    <th>Radius</th>
    <td>${def.radius}</td>
</tr>
<tr>
    <th>Speed</th>
    <td>${def.speed}</td>
</tr>
<tr>
    <th>Range</th>
    <td>${def.range}</td>
</tr>
<tr>
    <th>Critical Multiply</th>
    <td>${def.critical_mult}</td>
</tr>
<tr>
    <th>Obstacle Multiply</th>
    <td>${def.obstacleMult}</td>
</tr>
<tr>
    <th>Fallof</th>
    <td>${def.falloff}</td>
</tr>
<tr>
    <th>Tracer Width</th>
    <td>${def.tracer.width}</td>
</tr>
<tr>
    <th>Tracer Height</th>
    <td>${def.tracer.height}</td>
</tr>
<tr>
    <th>Tracer Color</th>
    <td>${def.tracer.color}</td>
</tr>
    `
}

set_item(GameItems.valueString[item])